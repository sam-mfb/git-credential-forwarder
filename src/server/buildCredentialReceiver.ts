import fs from "fs"
import http from "http"
import { CredentialOperationHandler, ServerType } from "../types"
import { gitCredentialIoApi } from "../gitcredential-io"
import { isCredentialRequestBody } from "../types.guard"
import { promisify } from "util"

const unlinkAsync = promisify(fs.unlink)

type DepsBase = {
  type: ServerType
  credentialOperationHandler: CredentialOperationHandler
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

export function buildCredentialReceiver(deps: Deps): () => Promise<void> {
  return async () => {
    const debug = deps.debugger ? deps.debugger : () => {}

    const server = http.createServer((req, res) => {
      const rawData: Buffer[] = []

      req.on("close", () => {
        debug("Request closed.")
      })
      req.on("error", err => {
        debug(`Request received error "${err}"`)
      })

      req.on("data", (chunk: Buffer) => {
        rawData.push(chunk)
      })
      req.on("end", () => {
        debug("Request ended")
        const deserializedBody = JSON.parse(rawData.join(""))
        debug(`Received body: "${rawData.join("")}"`)
        if (!isCredentialRequestBody(deserializedBody)) {
          throw new Error(`Body is not in expected format: ${deserializedBody}`)
        }
        const credentialRequestBody = deserializedBody
        debug("Running credential operation handler...")
        deps
          .credentialOperationHandler(
            credentialRequestBody.operation,
            credentialRequestBody.input
          )
          .then(
            output => {
              debug("Credential operation handler completed")
              debug("Sending success header")
              res.writeHead(200)
              debug(`Ending response with output: "${JSON.stringify(output)}"`)
              res.end(gitCredentialIoApi.serialize(output))
            },
            reason => {
              debug(`Credential operation handler errored: "${reason}"`)
              debug("Sending error header")
              res.writeHead(500, reason)
              debug("Ending response")
              res.end()
            }
          )
      })
    })

    switch (deps.type) {
      case "ipc":
        try {
          await unlinkAsync(deps.socketPath)
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw new Error(`Error removing old socket: ${error}`)
          }
        }
        server.listen(deps.socketPath)
        break
      case "tcp":
        server.listen(deps.port, deps.host)
        break
      default:
        deps satisfies never
    }
  }
}
