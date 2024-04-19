import {
  isGitCredentialHelperOperation,
  isGitCredentialInputOutput
} from "./git-credential-types.guards"
import type {
  CredentialRequestBody,
  VsCodeCredentialRequestBody
} from "./types"

export function isVsCodeCredentialRequestBody(
  input: unknown
): input is VsCodeCredentialRequestBody {
  return (
    typeof input === "object" &&
    input !== null &&
    "args" in input &&
    Array.isArray(input.args) &&
    input.args.length === 2 &&
    input.args.every((item: unknown) => typeof item === "string") &&
    "stdin" in input &&
    typeof input.stdin === "string"
  )
}

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
