import type {
  GitCredentialHelperOperation,
  GitCredentialInputOutput
} from "../git-credential-types"

export type CredentialOperationHandler = (
  operation: GitCredentialHelperOperation,
  input: GitCredentialInputOutput,
  vsCodeCompatible?: boolean
) => Promise<GitCredentialInputOutput>

export type CredentialHandlerOptions = {
  // pass a debugger function for extra output, e.g., console.log()
  debugger?: (message: string) => void
  // VS Code's helper inserts a command before the standard git operation
  vsCodeCompatible?: boolean
}
