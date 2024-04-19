import { buildCredentialForwarder } from "./buildCredentialForwarder"
import { buildGitCredentialHelper } from "./buildGitCredentialHelper"

const result = parseServerInfo(process.env.GIT_CREDENTIAL_FORWARDER_SERVER)

const credentialForwarder = buildCredentialForwarder({
  socketPath: SOCK_PATH,
  vsCodeCompatible: true
})

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
