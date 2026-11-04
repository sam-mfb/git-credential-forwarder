import {
  gitCredentialIoKeys,
  type GitCredentialInputOutput
} from "./git-credential-types"
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

/** Attributes that git sends as repeated `name[]=value` lines. */
const ARRAY_KEYS: ReadonlySet<string> = new Set(["wwwauth"])
/** Attributes whose value is a number (a Unix timestamp). */
const NUMBER_KEYS: ReadonlySet<string> = new Set(["password_expiry_utc"])

/**
 * Parses git's credential format (git-credential(1)): one `key=value` per
 * line. The value is everything after the first `=`, so values may contain
 * `=`. A key ending in `[]` adds to a list; an empty `key[]=` clears it.
 * Unknown keys and lines without `=` are ignored.
 */
function rawIoToJson(io: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const line of io.split("\n")) {
    if (!line.trim()) {
      continue
    }
    const separator = line.indexOf("=")
    if (separator <= 0) {
      continue
    }
    const rawKey = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim()

    if (rawKey.endsWith("[]")) {
      const key = rawKey.slice(0, -2)
      if (!ARRAY_KEYS.has(key)) {
        continue
      }
      const list = Array.isArray(result[key]) ? (result[key] as string[]) : []
      result[key] = value ? [...list, value] : []
      continue
    }

    if (!gitCredentialIoKeys.includes(rawKey) || ARRAY_KEYS.has(rawKey)) {
      continue
    }
    if (!value) {
      continue
    }
    result[rawKey] = NUMBER_KEYS.has(rawKey) ? toNumberIfNumeric(value) : value
  }

  return result
}

/** A numeric string becomes a number; anything else is kept as is. */
function toNumberIfNumeric(value: string): number | string {
  return /^\d+$/.test(value) ? Number(value) : value
}

/**
 * Writes git's credential format. Lists are written as one `key[]=value`
 * line per item, in order.
 */
function jsonToRawIo(json: Record<string, unknown>): string {
  const result: string[] = []

  for (const key in json) {
    if (!Object.prototype.hasOwnProperty.call(json, key)) {
      continue
    }
    const value = json[key]
    if (Array.isArray(value)) {
      for (const item of value) {
        result.push(`${key}[]=${item}`)
      }
    } else if (value) {
      result.push(`${key}=${value}`)
    }
  }

  return result.join("\n")
}
