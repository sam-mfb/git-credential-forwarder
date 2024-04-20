import { ServerType } from "../types"
import { buildCredentialQuerier } from "./buildCredentialQuerier"
import { Deps, buildCredentialReceiver } from "./buildCredentialReceiver"
import { findAvailablePort } from "./findAvailablePort"

const LOCALHOST = "127.0.0.1"

let serverType: ServerType = "tcp"

let socket = ""
if (process.env.GCH_FWD_IPC) {
  serverType = "ipc"
  socket = process.env.GCH_FWD_IPC
}

;(async () => {
  const credentialQuerier = buildCredentialQuerier({
    debugger: str => process.stderr.write(str + "\n")
  })

  const baseDeps = {
    credentialOperationHandler: credentialQuerier,
    debugger: (str: string): void => {
      process.stderr.write(str + "\n")
    }
  }

  let deps: Deps

  switch (serverType) {
    case "ipc":
      deps = {
        ...baseDeps,
        type: "ipc",
        socketPath: socket
      }
      break
    case "tcp":
      const port = await findAvailablePort(LOCALHOST)
      deps = {
        ...baseDeps,
        type: "tcp",
        host: LOCALHOST,
        port
      }
      break
  }
  const credentialReceiver = buildCredentialReceiver(deps)
  switch (deps.type) {
    case "ipc":
      console.log(`Starting IPC server listening on socket ${deps.socketPath}`)
      console.log(`Run the following command on your client environment:`)
      console.log(
        `\n    export GIT_CREDENTIAL_FORWARDER_SERVER="${deps.socketPath}"\n`
      )
      break
    case "tcp":
      console.log(`Starting TCP server listening on ${deps.host}:${deps.port}`)
      console.log(`Run the following command on your client environment:`)
      console.log(
        `\n    export GIT_CREDENTIAL_FORWARDER_SERVER="${deps.host}:${deps.port}"\n`
      )
      break
  }

  try {
    await credentialReceiver()
  } catch (err) {
    console.error(err)
  }

  console.log("Press ctrl+c to stop server.")
})()
