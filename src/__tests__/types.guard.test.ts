import { gitCredentialHelperOperation } from "../git-credential-types"
import { CredentialRequestBody } from "../types"
import { isCredentialRequestBody } from "../types.guard"

describe(isCredentialRequestBody.name, () => {
  it("returns true for a valid CredentialRequestBody with only required fields", () => {
    const validInput: CredentialRequestBody = {
      operation: gitCredentialHelperOperation.GET,
      input: {
        protocol: "https",
        host: "example.com"
      }
    }
    const result = isCredentialRequestBody(validInput)
    expect(result).toBeTruthy()
  })

  it("returns true for a valid CredentialRequestBody with optional fields", () => {
    const validInput: CredentialRequestBody = {
      operation: gitCredentialHelperOperation.STORE,
      input: {
        protocol: "https",
        host: "example.com",
        path: "repo",
        username: "user",
        password: "pass"
      }
    }
    const result = isCredentialRequestBody(validInput)
    expect(result).toBeTruthy()
  })

  it("returns false for null input", () => {
    const result = isCredentialRequestBody(null)
    expect(result).toBeFalsy()
  })

  it("returns false for undefined input", () => {
    const result = isCredentialRequestBody(undefined)
    expect(result).toBeFalsy()
  })

  it("returns false for a string input", () => {
    const result = isCredentialRequestBody("string")
    expect(result).toBeFalsy()
  })

  it("returns false for a number input", () => {
    const result = isCredentialRequestBody(123)
    expect(result).toBeFalsy()
  })

  it("returns false for an empty object", () => {
    const result = isCredentialRequestBody({})
    expect(result).toBeFalsy()
  })

  it("returns false when the operation field is missing", () => {
    const invalidInput = {
      input: {
        protocol: "https",
        host: "example.com"
      }
    }
    const result = isCredentialRequestBody(invalidInput)
    expect(result).toBeFalsy()
  })

  it("returns false when the input field is missing", () => {
    const invalidInput = {
      operation: gitCredentialHelperOperation.GET
    }
    const result = isCredentialRequestBody(invalidInput)
    expect(result).toBeFalsy()
  })

  it("returns false when input is not a GitCredentialInputOutput", () => {
    const invalidInput = {
      operation: gitCredentialHelperOperation.GET,
      input: "not_a_git_credential_input_output"
    }
    const result = isCredentialRequestBody(invalidInput)
    expect(result).toBeFalsy()
  })

  it("returns false when operation is not a valid GitCredentialHelperOperation", () => {
    const invalidInput = {
      operation: "invalid_operation",
      input: {
        protocol: "https",
        host: "example.com"
      }
    }
    const result = isCredentialRequestBody(invalidInput)
    expect(result).toBeFalsy()
  })
})
