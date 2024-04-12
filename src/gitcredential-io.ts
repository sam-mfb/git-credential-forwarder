import type { GitCredentialInputOutput } from "./git-credential-types"
import { isGitCredentialInputOutput } from "./git-credential-types.guards"
import { Result } from "./result"
import { CustomError } from "./types"

export const gitCredentialIoApi = {
  deserialize: (raw: string): Result<GitCredentialInputOutput, CustomError> => {
    const obj = JSON.parse(raw)
    if (isGitCredentialInputOutput(obj)) {
      return Result.success(obj)
    } else {
      return Result.failure<CustomError>({
        errorType: "generic",
        message: "Input is not valid git credential IO"
      })
    }
  },
  serialize: (io: GitCredentialInputOutput): string => {
    return JSON.stringify(io)
  }
}
