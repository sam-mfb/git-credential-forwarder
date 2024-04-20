import { color } from "../color"
import { ServerType } from "../types"
import { buildCredentialQuerier } from "./buildCredentialQuerier"
import { Deps, buildCredentialReceiver } from "./buildCredentialReceiver"
import { findAvailablePort } from "./findAvailablePort"

const LOCALHOST = "127.0.0.1"

let serverType: ServerType = "tcp"

let socket = ""
if (process.env.GIT_CREDENTIAL_FORWARDER_IPC) {
  serverType = "ipc"
  socket = process.env.GIT_CREDENTIAL_FORWARDER_IPC
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
      console.log(
        color(
          `Starting IPC server listening on socket ${deps.socketPath}`,
          "blue"
        )
      )
      console.log(
        color(
          `Bind mount this socket into your docker container and run the following command on your docker container (assuming you bind the socket at the same path):`,
          "yellow"
        )
      )
      console.log(
        color(
          `\n    export GIT_CREDENTIAL_FORWARDER_SERVER="${deps.socketPath}"\n`,
          "yellow"
        )
      )
      break
    case "tcp":
      console.log(
        color(
          `Starting TCP server listening on ${deps.host}:${deps.port}`,
          "blue"
        )
      )
      console.log(
        color(`Run the following command in your docker container:`, "yellow")
      )
      console.log(
        color(
          `\n    export GIT_CREDENTIAL_FORWARDER_SERVER="${
            deps.host === LOCALHOST ? "host.docker.internal" : deps.host
          }:${deps.port}"\n`,
          "yellow"
        )
      )
      break
  }

  try {
    await credentialReceiver()
  } catch (err) {
    console.error(err)
  }

  console.log(color("Press ctrl+c to stop server.", "blue"))
})()
