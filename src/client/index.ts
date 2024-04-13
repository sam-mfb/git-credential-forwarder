import { buildCredentialForwarder } from "../buildCredentialForwarder"
import { buildGitCredentialHelper } from "./buildGitCredentialHelper"

const socketPath = process.env.REMOTE_CONTAINERS_IPC
if (!socketPath) {
  console.error("Socket path environment variable not configured.")
  process.exit(1)
}

const credentialForwarder = buildCredentialForwarder({
  socketPath,
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
  debugger: str => process.stderr.write(str)
})

gitCredentialHelper(process.argv)
