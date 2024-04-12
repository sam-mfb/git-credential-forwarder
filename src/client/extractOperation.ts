import type { GitCredentialHelperOperation } from "../git-credential-types"
import type { CustomError } from "../types"

import { isGitCredentialHelperOperation } from "../git-credential-types.guards"
import { Result } from "../result"

export function extractOperation(
  argv: string[],
  options: {
    expectedLocation: number
  }
): Result<GitCredentialHelperOperation, CustomError> {
  const operation = argv[options.expectedLocation]
  if (typeof operation !== "string") {
    return Result.failure({
      errorType: "generic",
      message: `No value found at expected operation location ${options.expectedLocation}`
    })
  }
  if (!isGitCredentialHelperOperation(operation)) {
    return Result.failure({
      errorType: "silent",
      message: `${operation} is not a currently supported operation`
    })
  }
  return Result.success(operation)
}
