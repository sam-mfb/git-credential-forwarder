import {
  type GitCredentialAction,
  gitCredentialAction,
  gitCredentialHelperOperation,
  type GitCredentialHelperOperation
} from "./git-credential-types"

export function isGitCredentialHelperOperation(
  str: string
): str is GitCredentialHelperOperation {
  return Object.values<string>(gitCredentialHelperOperation).includes(str)
}

export function isGitCredentialAction(str: string): str is GitCredentialAction {
  return Object.values<string>(gitCredentialAction).includes(str)
}
