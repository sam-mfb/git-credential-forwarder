import type { CredentialOperationHandler } from "./client/types"
import type {
  GitCredentialHelperOperation,
  GitCredentialInputOutput
} from "./git-credential-types"

import http from "http"
import { isGitCredentialInputOutput } from "./git-credential-types.guards"

/*
 * This is the body format (deserialized) that VS Code's Dev Container
 * extension expects, so it needs to be used for compatibility with
 * that service
 */
type VsCodeRequestBody = {
  args: string[]
  stdin: string
}

type RequestBody = {
  operation: GitCredentialHelperOperation
  input: GitCredentialInputOutput
}

export function buildCredentialForwarder(deps: {
  socketPath: string
  vsCodeCompatible: boolean
}): CredentialOperationHandler {
  return (operation, input) => {
    return new Promise<GitCredentialInputOutput>((resolve, reject) => {
      const req = http.request(
        {
          socketPath: deps.socketPath,
          path: "/",
          method: "POST"
        },
        res => {
          let outputRaw: string = ""
          res.setEncoding("utf8")
          res.on("data", (chunk: string) => {
            outputRaw += chunk
          })
          res.on("error", reject)
          res.on("end", () => {
            const outputDeserialized = JSON.parse(outputRaw)
            if (isGitCredentialInputOutput(outputDeserialized)) {
              resolve(outputDeserialized)
            } else {
              reject(
                `Deserialized output not in the expected format. Output: ${outputDeserialized}`
              )
            }
          })
        }
      )

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
function toVsCodeReqBody(body: RequestBody): VsCodeRequestBody {
  const VS_CODE_GCH_PREFIX = "git-credential-helper"
  return {
    args: [VS_CODE_GCH_PREFIX, body.operation],
    stdin: JSON.stringify(body.input)
  }
}
