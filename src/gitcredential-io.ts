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
    return jsonToRawIo(io)
  }
}

function rawIoToJson(io: string): Record<string, unknown> {
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

function jsonToRawIo(json: Record<string, unknown>): string {
  const result: string[] = [] // Initialize an empty array to hold the key-value pairs

  for (const key in json) {
    if (json.hasOwnProperty(key)) {
      // Check if the key is actually a property of the object and not from its prototype chain
      const value = json[key]
      result.push(`${key}=${value}`) // Format as 'key=value' and add to the result array
    }
  }

  return result.join("\n") // Join all elements of the array with a newline character
}
