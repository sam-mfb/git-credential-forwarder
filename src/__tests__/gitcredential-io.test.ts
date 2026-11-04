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

describe("git credential format edge cases", () => {
  it("keeps '=' inside values (e.g. base64 padding)", () => {
    const result = gitCredentialIoApi.deserialize(
      "username=user\npassword=abc123==\noauth_refresh_token=a=b=c"
    )

    expect(result).toEqual(
      Result.success({
        username: "user",
        password: "abc123==",
        oauth_refresh_token: "a=b=c"
      })
    )
  })

  it("reads password_expiry_utc as a number", () => {
    const result = gitCredentialIoApi.deserialize(
      "username=user\npassword=pass\npassword_expiry_utc=1700000000"
    )

    expect(result).toEqual(
      Result.success({
        username: "user",
        password: "pass",
        password_expiry_utc: 1700000000
      })
    )
  })

  it("rejects a password_expiry_utc that is not a number", () => {
    const result = gitCredentialIoApi.deserialize(
      "password=pass\npassword_expiry_utc=soon"
    )

    expect(Result.isFailure(result)).toBe(true)
  })

  it("reads repeated wwwauth[] lines as a list, in order", () => {
    const result = gitCredentialIoApi.deserialize(
      'protocol=https\nhost=h\nwwwauth[]=Basic realm="x"\nwwwauth[]=Bearer'
    )

    expect(result).toEqual(
      Result.success({
        protocol: "https",
        host: "h",
        wwwauth: ['Basic realm="x"', "Bearer"]
      })
    )
  })

  it("clears the list on an empty wwwauth[] line", () => {
    const result = gitCredentialIoApi.deserialize(
      "wwwauth[]=Basic\nwwwauth[]=\nwwwauth[]=Bearer"
    )

    expect(result).toEqual(Result.success({ wwwauth: ["Bearer"] }))
  })

  it("writes lists as repeated key[]= lines", () => {
    expect(
      gitCredentialIoApi.serialize({
        protocol: "https",
        wwwauth: ["Basic a", "Bearer b"]
      })
    ).toBe("protocol=https\nwwwauth[]=Basic a\nwwwauth[]=Bearer b")
  })

  it("writes password_expiry_utc as a number", () => {
    expect(
      gitCredentialIoApi.serialize({
        password: "p",
        password_expiry_utc: 1700000000
      })
    ).toBe("password=p\npassword_expiry_utc=1700000000")
  })

  it("round-trips every supported attribute", () => {
    const credential = {
      protocol: "https",
      host: "example.com",
      path: "org/repo.git",
      username: "user",
      password: "pa=ss==",
      password_expiry_utc: 1700000000,
      oauth_refresh_token: "r=t",
      url: "https://example.com/org/repo.git",
      wwwauth: ["Basic realm=x", "Bearer"]
    }

    const result = gitCredentialIoApi.deserialize(
      gitCredentialIoApi.serialize(credential)
    )

    expect(result).toEqual(Result.success(credential))
  })
})
