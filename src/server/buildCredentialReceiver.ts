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

      req.on("data", (chunk: Buffer) => {
        rawData.push(chunk)
      })
      req.on("end", () => {
        const deserializedBody = JSON.parse(rawData.join(""))
        debug(`Received body: "${rawData.join("")}"`)
        if (!isCredentialRequestBody(deserializedBody)) {
          throw new Error(`Body is not in expected format: ${deserializedBody}`)
        }
        const credentialRequestBody = deserializedBody
        deps
          .credentialOperationHandler(
            credentialRequestBody.operation,
            credentialRequestBody.input
          )
          .then(
            output => {
              debug(`Received output: "${JSON.stringify(output)}"`)
              res.writeHead(200)
              res.end(gitCredentialIoApi.serialize(output))
            },
            () => {
              res.writeHead(500)
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
