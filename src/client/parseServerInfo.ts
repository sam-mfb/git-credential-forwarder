import { existsSync } from "fs"
import { Result } from "../result"
import { ServerType, CustomError } from "../types"

type ServerInfo = { type: ServerType } & (
  | {
      type: "ipc"
      socketPath: string
    }
  | {
      type: "tcp"
      host: string
      port: number
    }
)

/*
 * Parses a string that contains either host:port information or a path
 * to a valid socket and returns that information as a result. Returns
 * an error result if the string is neither of the two valid forms.
 */
export function parseServerInfo(info: string): Result<ServerInfo, CustomError> {
  const tcpRegex = /^(.+):(\d+)$/
  const tcpMatch = info.match(tcpRegex)

  if (tcpMatch) {
    const [, host, portStr] = tcpMatch
    if (!host) {
      return Result.failure<CustomError>({
        errorType: "generic",
        message: `No host defined`
      })
    }
    if (!portStr) {
      return Result.failure<CustomError>({
        errorType: "generic",
        message: `No port defined`
      })
    }
    const port = parseInt(portStr, 10)
    if (isNaN(port) || port < 0 || port > 65535) {
      return Result.failure<CustomError>({
        errorType: "generic",
        message: `Not a valid port: ${port}`
      })
    }
    return Result.success({
      type: "tcp",
      host,
      port
    })
  }

  if (info.includes("/") || info.includes("\\")) {
    if (existsSync(info)) {
      return Result.success({
        type: "ipc",
        socketPath: info
      })
    } else {
      return Result.failure<CustomError>({
        errorType: "generic",
        message: `Socket path does not exist: ${info}`
      })
    }
  }

  return Result.failure<CustomError>({
    errorType: "generic",
    message:
      "Invalid server info format, must be either a host:port or a valid socket path"
  })
}
