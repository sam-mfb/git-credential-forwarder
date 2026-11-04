import type {
  GitCredentialHelperOperation,
  GitCredentialInputOutput
} from "./git-credential-types"

export type ServerType = "ipc" | "tcp"

/**
 * Performs a git credential operation.
 *
 * `signal` is optional. When it is aborted, the handler should stop any work
 * it started for this operation (e.g. kill a child process) and reject.
 */
export type CredentialOperationHandler = (
  operation: GitCredentialHelperOperation,
  input: GitCredentialInputOutput,
  signal?: AbortSignal
) => Promise<GitCredentialInputOutput>

export type CustomError = {
  errorType: "generic" | "silent"
  message: string
}

export type CredentialRequestBody = {
  operation: GitCredentialHelperOperation
  input: GitCredentialInputOutput
}
