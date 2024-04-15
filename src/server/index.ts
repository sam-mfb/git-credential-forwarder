import { buildCredentialReceiver } from "./buildCredentialReceiver"

const credentialReceiver = buildCredentialReceiver({
  socketPath: "/tmp/cred_rec.sock",
  credentialOperationHandler: (operation, input) => {
    return Promise.resolve(input)
  },
  debugger: str => process.stderr.write(str + "\n")
})

credentialReceiver().catch(err => console.error(err))
