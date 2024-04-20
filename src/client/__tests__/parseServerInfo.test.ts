import fs from "fs"
import { Result } from "../../result"
import { parseServerInfo } from "../parseServerInfo"

describe(parseServerInfo.name, () => {
  it("returns correct tcp server information for host and port", () => {
    const info = "example.com:3000"
    const result = parseServerInfo(info)
    if (Result.isFailure(result)) {
      throw new Error()
    }
    expect(result.value.type).toEqual("tcp")
    if (!(result.value.type === "tcp")) {
      throw new Error()
    }
    expect(result.value.host).toEqual("example.com")
    expect(result.value.port).toEqual(3000)
  })

  it("returns failure when port is not numeric", () => {
    const info = "example.com:abc"
    const result = parseServerInfo(info)
    expect(Result.isFailure(result)).toBeTruthy()
  })

  it("returns failure when port is out of range", () => {
    const info = "example.com:70000"
    const result = parseServerInfo(info)
    expect(Result.isFailure(result)).toBeTruthy()
  })

  it("returns failure when port is missing", () => {
    const info = "example.com:"
    const result = parseServerInfo(info)
    expect(Result.isFailure(result)).toBeTruthy()
  })

  it("returns failure when host is missing", () => {
    const info = ":3000"
    const result = parseServerInfo(info)
    expect(Result.isFailure(result)).toBeTruthy()
  })

  it("returns correct ipc server information for valid socket path", () => {
    const info = "/tmp/socket"
    jest.spyOn(fs, "existsSync").mockReturnValue(true)
    const result = parseServerInfo(info)
    if (Result.isFailure(result)) {
      throw new Error()
    }
    expect(result.value.type).toEqual("ipc")
    if (!(result.value.type === "ipc")) {
      throw new Error()
    }
    expect(result.value.socketPath).toEqual("/tmp/socket")
  })

  it("returns failure when socket path does not exist", () => {
    const info = "/invalid/path"
    jest.spyOn(fs, "existsSync").mockReturnValue(false)
    const result = parseServerInfo(info)
    expect(Result.isFailure(result)).toBeTruthy()
  })

  it("returns failure for incorrect format", () => {
    const info = "invalid_input"
    const result = parseServerInfo(info)
    expect(Result.isFailure(result)).toBeTruthy()
  })
})
