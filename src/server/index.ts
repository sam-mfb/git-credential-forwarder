import { color } from "../color"
import { ServerType } from "../types"
import { buildCredentialQuerier } from "./buildCredentialQuerier"
import { Deps, buildCredentialReceiver } from "./buildCredentialReceiver"
import { findAvailablePort } from "./findAvailablePort"

const appOutput = (str: string): void => {
  console.log(color(str, "cyan"))
}
const instructions = (str: string): void => {
  console.log(color(str, "yellow"))
}

const LOCALHOST = "127.0.0.1"

let serverType: ServerType = "tcp"

let socket = ""
if (process.env.GIT_CREDENTIAL_FORWARDER_IPC) {
  serverType = "ipc"
  socket = process.env.GIT_CREDENTIAL_FORWARDER_IPC
}

let userSpecifiedPort: number | null = null
if (serverType === "tcp" && process.env.GIT_CREDENTIAL_FORWARDER_PORT) {
  const envPort = parseInt(process.env.GIT_CREDENTIAL_FORWARDER_PORT)
  if (!isNaN(envPort)) {
    userSpecifiedPort = envPort
  }
}

;(async () => {
  const credentialQuerier = buildCredentialQuerier({
    debugger: str => process.stderr.write(color(str, "cyan") + "\n")
  })

  const baseDeps = {
    credentialOperationHandler: credentialQuerier,
    debugger: (str: string): void => {
      process.stderr.write(color(str, "green") + "\n")
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
      if (userSpecifiedPort) {
        appOutput(`Attempting to use user specified port ${userSpecifiedPort}`)
      }
      const port = userSpecifiedPort ?? (await findAvailablePort(LOCALHOST))
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
      appOutput(`Starting IPC server listening on socket ${deps.socketPath}`)
      instructions(
        `Bind mount this socket into your docker container and run the following command on your docker container (assuming you bind the socket at the same path):`
      )
      instructions(
        `\n    export GIT_CREDENTIAL_FORWARDER_SERVER="${deps.socketPath}"\n`
      )
      break
    case "tcp":
      appOutput(`Starting TCP server listening on ${deps.host}:${deps.port}`)
      instructions(`Run the following command in your docker container:`)
      instructions(
        `\n    export GIT_CREDENTIAL_FORWARDER_SERVER="${
          deps.host === LOCALHOST ? "host.docker.internal" : deps.host
        }:${deps.port}"\n`
      )
      break
  }

  try {
    await credentialReceiver()
  } catch (err) {
    console.error(err)
  }

  appOutput("Press ctrl+c to stop server.")
})()
