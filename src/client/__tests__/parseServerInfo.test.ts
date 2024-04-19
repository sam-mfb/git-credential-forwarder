import fs from "fs"
import { Result, ResultType } from "../../result"
import { CustomError } from "../../types"
import { parseServerInfo } from "../parseServerInfo"

describe(parseServerInfo.name, () => {
  it("returns correct tcp server information for host and port", () => {
    const info = "example.com:3000"
    const result = parseServerInfo(info)
  })

  it("returns failure when port is not numeric", () => {
    const info = "example.com:abc"
    const result = parseServerInfo(info)
  })

  it("returns failure when port is out of range", () => {
    const info = "example.com:70000"
    const result = parseServerInfo(info)
  })

  it("returns failure when port is missing", () => {
    const info = "example.com:"
    const result = parseServerInfo(info)
  })

  it("returns failure when host is missing", () => {
    const info = ":3000"
    const result = parseServerInfo(info)
  })

  it("returns correct ipc server information for valid socket path", () => {
    const info = "/tmp/socket"
    jest.spyOn(fs, "existsSync").mockReturnValue(true)
    const result = parseServerInfo(info)
  })

  it("returns failure when socket path does not exist", () => {
    const info = "/invalid/path"
    jest.spyOn(fs, "existsSync").mockReturnValue(false)
    const result = parseServerInfo(info)
  })

  it("returns failure for incorrect format", () => {
    const info = "invalid_input"
    const result = parseServerInfo(info)
  })
})
