import type {
  GitCredentialHelperOperation,
  GitCredentialInputOutput
} from "../git-credential-types"

export type CredentialOperationHandler = (
  operation: GitCredentialHelperOperation,
  input: GitCredentialInputOutput,
  vsCodeCompatible?: boolean
) => Promise<GitCredentialInputOutput>
