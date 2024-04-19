import { buildCredentialQuerier } from "./buildCredentialQuerier"
import { buildCredentialReceiver } from "./buildCredentialReceiver"

const SOCK_PATH = process.env.GCH_FWD_IPC
if (!SOCK_PATH) {
  console.error(`GCH_FWD_IPC env variable not defined`)
  process.exit(1)
}

const credentialQuerier = buildCredentialQuerier({
  debugger: str => process.stderr.write(str + "\n")
})
const credentialReceiver = buildCredentialReceiver({
  socketPath: SOCK_PATH,
  credentialOperationHandler: credentialQuerier,
  debugger: str => process.stderr.write(str + "\n")
})

credentialReceiver().catch(err => console.error(err))
