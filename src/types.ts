import type {
  GitCredentialHelperOperation,
  GitCredentialInputOutput
} from "./git-credential-types"

export type ServerType = "ipc" | "tcp"

export type CredentialOperationHandler = (
  operation: GitCredentialHelperOperation,
  input: GitCredentialInputOutput
) => Promise<GitCredentialInputOutput>

export type CustomError = {
  errorType: "generic" | "silent"
  message: string
}

export type CredentialRequestBody = {
  operation: GitCredentialHelperOperation
  input: GitCredentialInputOutput
}
