import fs from "fs"
import http from "http"
import {
  CredentialOperationHandler,
  CredentialRequestBody,
  ServerType
} from "../types"
import { gitCredentialIoApi } from "../gitcredential-io"
import { isCredentialRequestBody } from "../types.guard"
import { checkCredentialIsSafe } from "../git-credential-safety"
import { Result } from "../result"
import { sanitize } from "../sanitize"
import { promisify } from "util"

const unlinkAsync = promisify(fs.unlink)

/** Longest HTTP status message the server sends; longer reasons are cut. */
const MAX_STATUS_MESSAGE_LENGTH = 200

type DepsBase = {
  type: ServerType
  credentialOperationHandler: CredentialOperationHandler
  /** Receives every failure, whether or not debugging is on. */
  errorLogger: (str: string) => void
  debugger?: (str: string) => void
}

export type Deps = DepsBase &
  (
    | {
        type: "ipc"
        socketPath: string
      }
    | {
        type: "tcp"
        host: string
        port: number
      }
  )

/**
 * Builds a function that starts the credential server.
 *
 * The returned promise resolves once the server is listening, with a
 * `close` function that stops it. It rejects if the server cannot listen
 * (e.g. the port is in use).
 *
 * Each request is handled on its own: a request that fails gets an error
 * response (400 for a bad request body, 500 for a failed credential
 * operation), the failure is logged, and the server keeps serving. If the
 * client disconnects before its response is sent, the operation is cancelled
 * through the handler's AbortSignal.
 */
export type RunningReceiver = {
  /** Stops accepting connections and closes open ones. */
  close: () => Promise<void>
}

export function buildCredentialReceiver(
  deps: Deps
): () => Promise<RunningReceiver> {
  return async () => {
    const debug = deps.debugger ? deps.debugger : () => {}
    const logError = deps.errorLogger

    const server = http.createServer((req, res) => {
      try {
        handleRequest(
          req,
          res,
          deps.credentialOperationHandler,
          debug,
          logError
        )
      } catch (err) {
        logError(`Unexpected error handling request: ${errorMessage(err)}`)
        respond(res, 500, "Internal server error", "", logError)
      }
    })

    switch (deps.type) {
      case "ipc":
        try {
          await unlinkAsync(deps.socketPath)
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw new Error(`Error removing old socket: ${error}`, {
              cause: error
            })
          }
        }
        await listen(server, onListening =>
          server.listen(deps.socketPath, onListening)
        )
        break
      case "tcp":
        await listen(server, onListening =>
          server.listen(deps.port, deps.host, onListening)
        )
        break
      default:
        deps satisfies never
    }

    server.on("error", err => {
      logError(`Server error: ${err.message}`)
    })

    return {
      close: () =>
        new Promise<void>((resolve, reject) => {
          server.close(err => (err ? reject(err) : resolve()))
          server.closeAllConnections()
        })
    }
  }
}

/** Resolves once `start` has the server listening; rejects on a listen error. */
function listen(
  server: http.Server,
  start: (onListening: () => void) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject)
    start(() => {
      server.off("error", reject)
      resolve()
    })
  })
}

function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  handler: CredentialOperationHandler,
  debug: (str: string) => void,
  logError: (str: string) => void
): void {
  const chunks: Buffer[] = []
  const abortController = new AbortController()

  res.on("close", () => {
    if (!res.writableFinished) {
      debug("Client disconnected before the response was sent; cancelling.")
      abortController.abort()
    }
  })
  req.on("close", () => {
    debug("Request closed.")
  })
  req.on("error", err => {
    logError(`Request error: ${err.message}`)
  })
  req.on("data", (chunk: Buffer) => {
    chunks.push(chunk)
  })
  req.on("end", () => {
    debug("Request ended")
    // Decode only after all chunks arrive, so a multi-byte character split
    // across chunks is decoded correctly.
    const rawBody = Buffer.concat(chunks).toString("utf8")
    debug(`Received body: "${rawBody}"`)

    const bodyResult = parseRequestBody(rawBody)
    if (Result.isFailure(bodyResult)) {
      logError(`Rejected request: ${bodyResult.error.message}`)
      respond(res, 400, bodyResult.error.message, "", logError)
      return
    }
    const { operation, input } = bodyResult.value

    debug("Running credential operation handler...")
    // Promise.resolve().then() also catches a handler that throws instead of
    // rejecting.
    Promise.resolve()
      .then(() => handler(operation, input, abortController.signal))
      .then(
        output => {
          debug("Credential operation handler completed")
          debug(`Ending response with output: "${JSON.stringify(output)}"`)
          respond(
            res,
            200,
            "OK",
            gitCredentialIoApi.serialize(output),
            logError
          )
        },
        (reason: unknown) => {
          if (abortController.signal.aborted) {
            debug(`Credential operation cancelled: ${errorMessage(reason)}`)
            return
          }
          logError(`Credential operation failed: ${errorMessage(reason)}`)
          respond(res, 500, errorMessage(reason), "", logError)
        }
      )
      .catch((err: unknown) => {
        logError(`Unexpected error sending response: ${errorMessage(err)}`)
        res.destroy()
      })
  })
}

function parseRequestBody(raw: string): Result<CredentialRequestBody, Error> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    return Result.failure(
      new Error(`Request body is not valid JSON: ${errorMessage(err)}`)
    )
  }
  if (!isCredentialRequestBody(parsed)) {
    return Result.failure(
      new Error("Request body is not a valid credential request")
    )
  }
  // The input is written to `git credential` as key=value lines, so it must
  // not be able to add lines or attributes of its own.
  const safety = checkCredentialIsSafe(parsed.input)
  if (Result.isFailure(safety)) {
    return safety
  }
  return Result.success(parsed)
}

/**
 * Sends a response if one can still be sent. If the response has already
 * started or the connection is gone, it closes the connection instead.
 */
function respond(
  res: http.ServerResponse,
  status: number,
  reason: string,
  body: string,
  logError: (str: string) => void
): void {
  if (res.headersSent || res.writableEnded || res.destroyed) {
    res.destroy()
    return
  }
  try {
    res.writeHead(status, toStatusMessage(reason))
    res.end(body)
  } catch (err) {
    logError(`Could not send response: ${errorMessage(err)}`)
    res.destroy()
  }
}

/**
 * HTTP status messages may only hold printable characters on one line. This
 * also removes passwords and keeps the message short.
 */
export function toStatusMessage(reason: string): string {
  const printable = sanitize(reason)
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E]/g, "?")
    .trim()
  return printable.length > MAX_STATUS_MESSAGE_LENGTH
    ? printable.slice(0, MAX_STATUS_MESSAGE_LENGTH - 3) + "..."
    : printable
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
