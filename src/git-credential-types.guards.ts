/* eslint-disable dot-notation */
import {
  type GitCredentialAction,
  gitCredentialAction,
  gitCredentialHelperOperation,
  type GitCredentialHelperOperation,
  type GitCredentialInputOutput
} from "./git-credential-types"

export function isGitCredentialHelperOperation(
  str: string
): str is GitCredentialHelperOperation {
  return Object.values<string>(gitCredentialHelperOperation).includes(str)
}

export function isGitCredentialAction(str: string): str is GitCredentialAction {
  return Object.values<string>(gitCredentialAction).includes(str)
}

export function isGitCredentialInputOutput(
  input: unknown
): input is GitCredentialInputOutput {
  return (
    typeof input === "object" &&
    !Array.isArray(input) &&
    input !== null &&
    ("protocol" in input ? typeof input["protocol"] === "string" : true) &&
    ("host" in input ? typeof input["host"] === "string" : true) &&
    ("path" in input ? typeof input["path"] === "string" : true) &&
    ("username" in input ? typeof input["username"] === "string" : true) &&
    ("password" in input ? typeof input["password"] === "string" : true) &&
    ("password_expiry_utc" in input
      ? typeof input["password_expiry_utc"] === "number"
      : true) &&
    ("oauth_refresh_token" in input
      ? typeof input["oauth_refresh_token"] === "string"
      : true) &&
    ("url" in input ? typeof input["url"] === "string" : true) &&
    ("wwwauth" in input
      ? Array.isArray(input["wwwauth"]) &&
        input["wwwauth"].every(item => typeof item === "string")
      : true)
  )
}
