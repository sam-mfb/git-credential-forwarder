import { Result } from "./result"

/**
 * Single-valued attributes of git's credential protocol, as documented in
 * git-credential(1).
 */
export const gitCredentialScalarAttributes = [
  "protocol",
  "host",
  "path",
  "username",
  "password",
  "password_expiry_utc",
  "oauth_refresh_token",
  "url",
  "authtype",
  "credential",
  "ephemeral",
  "continue"
] as const

/**
 * Multi-valued attributes of git's credential protocol. On the wire they are
 * written as repeated `name[]=value` lines; in our JSON they are arrays under
 * the name without brackets.
 */
export const gitCredentialArrayAttributes = [
  "wwwauth",
  "state",
  "capability"
] as const

const scalarAttributes: ReadonlySet<string> = new Set(
  gitCredentialScalarAttributes
)
const arrayAttributes: ReadonlySet<string> = new Set(
  gitCredentialArrayAttributes
)

// git-credential(1): a value "may contain any bytes except newline or NUL".
// Carriage return is rejected too, because some helpers treat CRLF as a line
// end.
const FORBIDDEN_IN_VALUE = /[\n\r\0]/

/**
 * Checks that a credential can be written to `git credential` without
 * changing its meaning: every key is a documented attribute, every value has
 * the right type, and no value contains a newline, carriage return or NUL
 * (which would let a value add lines of its own).
 *
 * Error messages name the attribute but never include its value, since
 * values may be secrets.
 */
export function checkCredentialIsSafe(
  credential: Record<string, unknown>
): Result<void, Error> {
  for (const [key, value] of Object.entries(credential)) {
    if (scalarAttributes.has(key)) {
      const problem = checkScalar(key, value)
      if (problem) {
        return Result.failure(problem)
      }
    } else if (arrayAttributes.has(key)) {
      if (!Array.isArray(value)) {
        return Result.failure(
          new Error(`Credential attribute "${key}" must be a list`)
        )
      }
      for (const item of value) {
        const problem = checkScalar(key, item)
        if (problem) {
          return Result.failure(problem)
        }
      }
    } else {
      return Result.failure(
        new Error(`Unknown credential attribute ${JSON.stringify(key)}`)
      )
    }
  }
  return Result.success(undefined)
}

function checkScalar(key: string, value: unknown): Error | null {
  if (typeof value === "number") {
    return null
  }
  if (typeof value !== "string") {
    return new Error(`Credential attribute "${key}" must be a string`)
  }
  if (FORBIDDEN_IN_VALUE.test(value)) {
    return new Error(
      `Credential attribute "${key}" contains a newline, carriage return or NUL`
    )
  }
  return null
}
