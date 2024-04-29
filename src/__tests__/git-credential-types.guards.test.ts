import {
  gitCredentialAction,
  gitCredentialHelperOperation
} from "../git-credential-types"
import {
  isGitCredentialHelperOperation,
  isGitCredentialAction,
  isGitCredentialInputOutput
} from "../git-credential-types.guards"

describe(isGitCredentialHelperOperation.name, () => {
  it("returns true for valid operations", () => {
    expect(
      isGitCredentialHelperOperation(gitCredentialHelperOperation.GET)
    ).toBeTruthy()
    expect(
      isGitCredentialHelperOperation(gitCredentialHelperOperation.STORE)
    ).toBeTruthy()
    expect(
      isGitCredentialHelperOperation(gitCredentialHelperOperation.ERASE)
    ).toBeTruthy()
  })

  it("returns false for an invalid string", () => {
    expect(isGitCredentialHelperOperation("invalid_operation")).toBeFalsy()
  })

  it("returns false for an empty string", () => {
    expect(isGitCredentialHelperOperation("")).toBeFalsy()
  })
})

describe(isGitCredentialAction.name, () => {
  it("returns true for valid actions", () => {
    expect(isGitCredentialAction(gitCredentialAction.FILL)).toBeTruthy()
    expect(isGitCredentialAction(gitCredentialAction.APPROVE)).toBeTruthy()
    expect(isGitCredentialAction(gitCredentialAction.REJECT)).toBeTruthy()
  })

  it("returns false for an invalid string", () => {
    expect(isGitCredentialAction("invalid_action")).toBeFalsy()
  })

  it("returns false for an empty string", () => {
    expect(isGitCredentialAction("")).toBeFalsy()
  })
})

describe(isGitCredentialInputOutput.name, () => {
  it("returns true for a valid GitCredentialInputOutput object", () => {
    const validInput = {
      protocol: "https",
      host: "example.com",
      path: "path/to/resource",
      username: "user",
      password: "password",
      password_expiry_utc: 1609459200,
      oauth_refresh_token: "token"
    }
    expect(isGitCredentialInputOutput(validInput)).toBeTruthy()
  })

  it("returns false for null", () => {
    expect(isGitCredentialInputOutput(null)).toBeFalsy()
  })

  it("returns false for undefined", () => {
    expect(isGitCredentialInputOutput(undefined)).toBeFalsy()
  })

  it("returns false for non-object types", () => {
    expect(isGitCredentialInputOutput(123)).toBeFalsy()
    expect(isGitCredentialInputOutput("string")).toBeFalsy()
    expect(isGitCredentialInputOutput([])).toBeFalsy()
  })

  it("returns true for a minimal valid GitCredentialInputOutput object", () => {
    const minimalValidInput = {
      protocol: "https",
      host: "example.com"
    }
    expect(isGitCredentialInputOutput(minimalValidInput)).toBeTruthy()
  })

  it("returns false for objects with invalid types for properties", () => {
    const invalidInput = {
      protocol: 123, // should be string
      host: null // should be string
    }
    expect(isGitCredentialInputOutput(invalidInput)).toBeFalsy()
  })
})

