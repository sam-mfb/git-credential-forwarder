import { buildCredentialQuerier } from "./buildCredentialQuerier"
import { Deps, buildCredentialReceiver } from "./buildCredentialReceiver"
import { findAvailablePort } from "./findAvailablePort"

const LOCALHOST = "127.0.0.1"

let serverType: "ipc" | "tcp" = "tcp"

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

  try {
    await credentialReceiver()
  } catch (err) {
    console.error(err)
  }
})()
