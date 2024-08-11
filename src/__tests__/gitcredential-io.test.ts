import { gitCredentialIoApi } from "../gitcredential-io"
import { Result } from "../result"

describe(`${gitCredentialIoApi.deserialize.name}`, () => {
  it("returns a successful result with correct fields from a well-formatted string", () => {
    const input =
      "protocol=https\nhost=example.com\nusername=user\npassword=pass"
    const expectedOutput = {
      protocol: "https",
      host: "example.com",
      username: "user",
      password: "pass"
    }

    const result = gitCredentialIoApi.deserialize(input)

    expect(result).toEqual(Result.success(expectedOutput))
  })

  it("ignores malformed input", () => {
    const malformedInput = "protocol=https\nusernameuser\npassword=pass"
    const expectedObject = {
      protocol: "https",
      password: "pass"
    }

    const result = gitCredentialIoApi.deserialize(malformedInput)

    expect(result).toEqual(Result.success(expectedObject))
  })

  it("ignores extra fields not defined in the GitCredentialInputOutput type", () => {
    const inputWithExtra =
      "protocol=https\nhost=example.com\nextra=field\nusername=user"
    const expectedOutput = {
      protocol: "https",
      host: "example.com",
      username: "user"
    }

    const result = gitCredentialIoApi.deserialize(inputWithExtra)

    expect(result).toEqual(Result.success(expectedOutput))
  })

  it("empty input string results in empty object", () => {
    const emptyInput = ""
    const expectedOutput = {}

    const result = gitCredentialIoApi.deserialize(emptyInput)

    expect(result).toEqual(Result.success(expectedOutput))
  })
})

describe(`${gitCredentialIoApi.serialize.name}`, () => {
  it("converts a GitCredentialInputOutput object to a correctly formatted string", () => {
    const input = {
      protocol: "https",
      host: "example.com",
      username: "user",
      password: "pass"
    }
    const expectedString =
      "protocol=https\nhost=example.com\nusername=user\npassword=pass"

    const result = gitCredentialIoApi.serialize(input)

    expect(result).toBe(expectedString)
  })

  it("omits undefined fields from the output string", () => {
    const inputWithUndefined = {
      protocol: "https",
      host: "example.com",
      username: undefined
    }
    const expectedString = "protocol=https\nhost=example.com"

    const result = gitCredentialIoApi.serialize(inputWithUndefined)

    expect(result).toBe(expectedString)
  })

  it("is robust to attempts to overwrite hasOwnProperty prototype property", () => {
    const inputShadowingProto = {
      protocol: "https",
      host: "example.com",
      hasOwnProperty: 1
    }
    const expectedString = "protocol=https\nhost=example.com\nhasOwnProperty=1"

    const result = gitCredentialIoApi.serialize(inputShadowingProto)

    expect(result).toBe(expectedString)
  })

  it("handles empty GitCredentialInputOutput object without errors", () => {
    const emptyInput = {}
    const expectedString = ""

    const result = gitCredentialIoApi.serialize(emptyInput)

    expect(result).toBe(expectedString)
  })
})
