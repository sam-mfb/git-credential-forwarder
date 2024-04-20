import {
  isGitCredentialHelperOperation,
  isGitCredentialInputOutput
} from "./git-credential-types.guards"
import type { CredentialRequestBody } from "./types"

export function isCredentialRequestBody(
  input: unknown
): input is CredentialRequestBody {
  return (
    typeof input === "object" &&
    input !== null &&
    "operation" in input &&
    typeof input.operation === "string" &&
    isGitCredentialHelperOperation(input.operation) &&
    "input" in input &&
    isGitCredentialInputOutput(input.input)
  )
}
