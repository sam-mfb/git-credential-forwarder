import { Result } from "../result"
import { CredentialOperationHandler } from "../types"
import { buildCredentialForwarder } from "./buildCredentialForwarder"
import { buildGitCredentialHelper } from "./buildGitCredentialHelper"
import { parseServerInfo } from "./parseServerInfo"

const serverInfoRaw = process.env.GIT_CREDENTIAL_FORWARDER_SERVER
if (!serverInfoRaw) {
  console.error(
    "The environmental variable GIT_CREDENTIAL_FORWARDER_SERVER was not defined"
  )
  process.exit(1)
}

const serverInfoResult = parseServerInfo(serverInfoRaw)
if (Result.isFailure(serverInfoResult)) {
  console.error(`Invalid server info: "${serverInfoResult.error.message}"`)
  process.exit(1)
}

const serverInfo = serverInfoResult.value

let credentialForwarder: CredentialOperationHandler

switch (serverInfo.type) {
  case "ipc":
    credentialForwarder = buildCredentialForwarder({
      type: "ipc",
      socketPath: serverInfo.socketPath,
      debugger: str => process.stderr.write(str + "\n")
    })
    break
  case "tcp":
    credentialForwarder = buildCredentialForwarder({
      type: "tcp",
      host: serverInfo.host,
      port: serverInfo.port,
      debugger: str => process.stderr.write(str + "\n")
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
  debugger: str => process.stderr.write(str + "\n")
})

gitCredentialHelper(process.argv)
