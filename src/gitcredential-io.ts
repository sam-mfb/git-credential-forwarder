import type { GitCredentialInputOutput } from "./git-credential-types"
import { isGitCredentialInputOutput } from "./git-credential-types.guards"
import { Result } from "./result"
import { CustomError } from "./types"

export const gitCredentialIoApi = {
  deserialize: (raw: string): Result<GitCredentialInputOutput, CustomError> => {
    const obj = rawIoToJson(raw)
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

function rawIoToJson(io: string): Record<string, any> {
  const lines = io.split("\n") // Split the input into lines
  const result: { [key: string]: string } = {} // Initialize an empty object to hold the key-value pairs

  lines.forEach(line => {
    if (line.trim()) {
      // Check if the line is not just whitespace
      const [key, value] = line.split("=") // Split each line into key and value at the '=' character
      if (key && value) {
        // Ensure both key and value are present
        result[key.trim()] = value.trim() // Trim whitespace and add to result object
      }
    }
  })

  return result
}
