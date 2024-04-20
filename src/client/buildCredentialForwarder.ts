import type { CredentialOperationHandler, ServerType } from "../types"
import type { GitCredentialInputOutput } from "../git-credential-types"

import http from "http"
import { gitCredentialIoApi } from "../gitcredential-io"
import { Result } from "../result"

export function buildCredentialForwarder(
  deps: {
    type: ServerType
    debugger?: (str: string) => void
  } & (
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
): CredentialOperationHandler {
  const debug = deps.debugger ? deps.debugger : () => {}
  return (operation, input) => {
    return new Promise<GitCredentialInputOutput>((resolve, reject) => {
      const requestOptions: http.RequestOptions = {
        path: "/",
        method: "POST"
      }
      switch (deps.type) {
        case "ipc":
          requestOptions.socketPath = deps.socketPath
          break
        case "tcp":
          requestOptions.port = deps.port
          requestOptions.host = deps.host
          break
      }
      const req = http.request(requestOptions, res => {
        let outputRaw: string = ""
        res.setEncoding("utf8")
        res.on("data", (chunk: string) => {
          debug(`Data chunk received: "${chunk}"`)
          outputRaw += chunk
        })
        res.on("error", err => reject(err))
        res.on("end", () => {
          debug(`Response ended: "${outputRaw}"`)
          const outputDeserializedResult =
            gitCredentialIoApi.deserialize(outputRaw)
          if (Result.isSuccess(outputDeserializedResult)) {
            resolve(outputDeserializedResult.value)
          } else {
            reject(outputDeserializedResult.error)
          }
        })
        res.on("close", () => {
          debug("Response closed")
        })
      })

      req.on("error", reject)
      const requestBody = {
        operation,
        input
      }
      const serializedRequestBody = JSON.stringify(requestBody)
      debug(`Sending request body: "${serializedRequestBody}"`)
      req.write(serializedRequestBody)
      debug("Ending request")
      req.end()
    })
  }
}
