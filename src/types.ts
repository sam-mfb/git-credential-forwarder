import type {
  GitCredentialHelperOperation,
  GitCredentialInputOutput
} from "./git-credential-types"

export type CredentialOperationHandler = (
  operation: GitCredentialHelperOperation,
  input: GitCredentialInputOutput
) => Promise<GitCredentialInputOutput>

export type CustomError = {
  errorType: "generic" | "silent"
  message: string
}

/*
 * This is the body format (deserialized) that VS Code's Dev Container
 * extension expects, so it needs to be used for compatibility with
 * that service
 */
export type VsCodeCredentialRequestBody = {
  args: [string, string]
  stdin: string
}

export type CredentialRequestBody = {
  operation: GitCredentialHelperOperation
  input: GitCredentialInputOutput
}
