import type {
  CredentialOperationHandler,
  CredentialRequestBody,
  ServerType,
  VsCodeCredentialRequestBody
} from "../types"
import type { GitCredentialInputOutput } from "../git-credential-types"

import http from "http"
import { gitCredentialIoApi } from "../gitcredential-io"
import { Result } from "../result"

export function buildCredentialForwarder(
  deps: {
    type: ServerType
    vsCodeCompatible: boolean
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
          outputRaw += chunk
        })
        res.on("error", reject)
        res.on("end", () => {
          const outputDeserializedResult =
            gitCredentialIoApi.deserialize(outputRaw)
          if (Result.isSuccess(outputDeserializedResult)) {
            resolve(outputDeserializedResult.value)
          } else {
            reject(outputDeserializedResult.error)
          }
        })
      })

      req.on("error", reject)
      const requestBody = {
        operation,
        input
      }
      const serializedRequestBody = JSON.stringify(
        deps.vsCodeCompatible ? toVsCodeReqBody(requestBody) : requestBody
      )
      req.write(serializedRequestBody)
      req.end()
    })
  }
}

/*
 * Converts request body into the format that the VS Code Dev Container extension
 * expects. It appears to require a specific body format as well as a specific
 * prefix-type argument, presumably because its service does more than one thing
 */
function toVsCodeReqBody(
  body: CredentialRequestBody
): VsCodeCredentialRequestBody {
  const VS_CODE_GCH_PREFIX = "git-credential-helper"
  return {
    args: [VS_CODE_GCH_PREFIX, body.operation],
    stdin: gitCredentialIoApi.serialize(body.input)
  }
}
