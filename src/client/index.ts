import { EnvKey } from "../env"
import { buildOutputWriter } from "../output"
import { Result } from "../result"
import { CredentialOperationHandler } from "../types"
import { buildCredentialForwarder } from "./buildCredentialForwarder"
import { buildGitCredentialHelper } from "./buildGitCredentialHelper"
import { parseServerInfo } from "./parseServerInfo"

const DEBUG = process.env[EnvKey.DEBUG]

const errorOutput = buildOutputWriter({ color: "red", stream: process.stderr })

const serverInfoRaw = process.env[EnvKey.SERVER]
if (!serverInfoRaw) {
  errorOutput(`The environmental variable ${[EnvKey.SERVER]} was not defined`)
  process.exit(1)
}

const serverInfoResult = parseServerInfo(serverInfoRaw)
if (Result.isFailure(serverInfoResult)) {
  errorOutput(`Invalid server info: "${serverInfoResult.error.message}"`)
  process.exit(1)
}

const serverInfo = serverInfoResult.value

let credentialForwarder: CredentialOperationHandler

switch (serverInfo.type) {
  case "ipc":
    credentialForwarder = buildCredentialForwarder({
      type: "ipc",
      socketPath: serverInfo.socketPath,
      debugger: DEBUG
        ? buildOutputWriter({ color: "cyan", stream: process.stdout })
        : undefined
    })
    break
  case "tcp":
    credentialForwarder = buildCredentialForwarder({
      type: "tcp",
      host: serverInfo.host,
      port: serverInfo.port,
      debugger: DEBUG
        ? buildOutputWriter({ color: "cyan", stream: process.stdout })
        : undefined
    })
    break
}

const gitCredentialHelper = buildGitCredentialHelper({
  streams: {
    input: process.stdin,
    output: process.stdout,
    error: process.stderr
  },
  onExit: {
    success: function (): void {
      process.exit(0)
    },
    failure: function (): void {
      process.exit(1)
    }
  },
  credentialOperationHandler: credentialForwarder,
  debugger: DEBUG
    ? buildOutputWriter({ color: "green", stream: process.stdout })
    : undefined
})

gitCredentialHelper(process.argv)
