import {
  checkCredentialIsSafe,
  gitCredentialArrayAttributes,
  gitCredentialScalarAttributes
} from "../git-credential-safety"
import { Result } from "../result"

function errorOf(credential: Record<string, unknown>): string | undefined {
  const result = checkCredentialIsSafe(credential)
  return Result.isFailure(result) ? result.error.message : undefined
}

describe("checkCredentialIsSafe", () => {
  it("accepts every documented attribute", () => {
    const credential: Record<string, unknown> = {}
    for (const key of gitCredentialScalarAttributes) {
      credential[key] = "value"
    }
    for (const key of gitCredentialArrayAttributes) {
      credential[key] = ["one", "two"]
    }
    credential.password_expiry_utc = 1700000000

    expect(errorOf(credential)).toBeUndefined()
  })

  it("covers the attributes in git-credential(1)", () => {
    expect([...gitCredentialScalarAttributes].sort()).toEqual(
      [
        "authtype",
        "continue",
        "credential",
        "ephemeral",
        "host",
        "oauth_refresh_token",
        "password",
        "password_expiry_utc",
        "path",
        "protocol",
        "url",
        "username"
      ].sort()
    )
    expect([...gitCredentialArrayAttributes].sort()).toEqual(
      ["capability", "state", "wwwauth"].sort()
    )
  })

  it("accepts an empty credential", () => {
    expect(errorOf({})).toBeUndefined()
  })

  it("accepts values containing '='", () => {
    expect(errorOf({ password: "abc==" })).toBeUndefined()
  })

  it.each([
    ["newline", "example.com\nhost=evil.com"],
    ["carriage return", "example.com\rhost=evil.com"],
    ["NUL", "example.com\0"]
  ])("rejects a value containing a %s", (_name, value) => {
    expect(errorOf({ protocol: "https", host: value })).toBe(
      'Credential attribute "host" contains a newline, carriage return or NUL'
    )
  })

  it("rejects a forbidden character in a list item", () => {
    expect(errorOf({ wwwauth: ["Basic", "Bearer\nhost=evil"] })).toBe(
      'Credential attribute "wwwauth" contains a newline, carriage return or NUL'
    )
  })

  it("rejects unknown keys, including ones that could add lines", () => {
    expect(errorOf({ foo: "bar" })).toBe('Unknown credential attribute "foo"')
    expect(errorOf({ "x\nhost": "evil.com" })).toBe(
      'Unknown credential attribute "x\\nhost"'
    )
    expect(errorOf({ "wwwauth[]": ["a"] })).toBe(
      'Unknown credential attribute "wwwauth[]"'
    )
  })

  it("rejects wrong value types", () => {
    expect(errorOf({ host: { nested: true } })).toBe(
      'Credential attribute "host" must be a string'
    )
    expect(errorOf({ wwwauth: "Basic" })).toBe(
      'Credential attribute "wwwauth" must be a list'
    )
  })

  it("never puts the value in the error message", () => {
    expect(errorOf({ password: "hunter2\nx" })).not.toContain("hunter2")
  })
})
