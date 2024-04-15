import { buildCredentialQuerier } from "./buildCredentialQuerier"
import { buildCredentialReceiver } from "./buildCredentialReceiver"

const credentialQuerier = buildCredentialQuerier({
  debugger: str => process.stderr.write(str + "\n")
})
const credentialReceiver = buildCredentialReceiver({
  socketPath: "/tmp/cred_rec.sock",
  credentialOperationHandler: credentialQuerier,
  debugger: str => process.stderr.write(str + "\n")
})

credentialReceiver().catch(err => console.error(err))
