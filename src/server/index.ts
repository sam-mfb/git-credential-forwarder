import { EnvKey } from "../env"
import { buildOutputWriter } from "../output"
import { ServerType } from "../types"
import { buildCredentialQuerier } from "./buildCredentialQuerier"
import { type Deps, buildCredentialReceiver } from "./buildCredentialReceiver"
import { findAvailablePort } from "./findAvailablePort"

const DEBUG = process.env[EnvKey.DEBUG]
const LOCALHOST = "127.0.0.1"
const DOCKER_HOST_IP = "host.docker.internal"
const GIT_CMD = "git"

const appOutput = buildOutputWriter({ color: "cyan", stream: process.stdout })
const instructions = buildOutputWriter({
  color: "yellow",
  stream: process.stdout
})
const configOutput = buildOutputWriter({
  color: "white",
  stream: process.stdout
})
const errorOutput = buildOutputWriter({ color: "red", stream: process.stderr })

let serverType: ServerType = "tcp"
let socket = ""
const socketEnv = process.env[EnvKey.SOCKET]
if (socketEnv) {
  serverType = "ipc"
  socket = socketEnv
}

let userSpecifiedPort: number | null = null
const portEnv = process.env[EnvKey.PORT]
if (serverType === "tcp" && portEnv) {
  const parsedPort = parseInt(portEnv)
  if (!isNaN(parsedPort)) {
    userSpecifiedPort = parsedPort
  }
}

;(async () => {
  let gitPath = process.env[EnvKey.GIT_PATH]
  if (gitPath) {
    errorOutput(
      `App is using git command at path specified by environmental variable ${EnvKey.GIT_PATH}=${gitPath}. Make sure this is what you intended.`
    )
  } else {
    gitPath = GIT_CMD
  }

  const credentialQuerier = buildCredentialQuerier({
    externalEnv: process.env,
    gitPath: gitPath,
    debugger: DEBUG
      ? buildOutputWriter({ color: "magenta", stream: process.stdout })
      : undefined
  })

  const baseDeps = {
    credentialOperationHandler: credentialQuerier,
    debugger: DEBUG
      ? buildOutputWriter({ color: "green", stream: process.stdout })
      : undefined
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
    case "tcp": {
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
  }
  const credentialReceiver = buildCredentialReceiver(deps)
  switch (deps.type) {
    case "ipc":
      appOutput(`Starting IPC server listening on socket ${deps.socketPath}`)
      instructions(
        `Bind mount this socket into your docker container and run the following command on your docker container (assuming you bind the socket at the same path):\n`
      )
      instructions(`    export ${EnvKey.SERVER}="${deps.socketPath}"\n`)
      break
    case "tcp":
      appOutput(`Starting TCP server listening on ${deps.host}:${deps.port}`)
      instructions(`Run the following command in your docker container:\n`)
      configOutput(
        `    export ${EnvKey.SERVER}="${
          deps.host === LOCALHOST ? DOCKER_HOST_IP : deps.host
        }:${deps.port}"\n`
      )
      break
  }
  instructions(
    `Edit your git configuration file inside your docker container to call the git-credential-forwarder client script, for example:\n`
  )
  configOutput(`   [credential]`)
  configOutput(`     helper = "!f() { node ~/gcf-client.js $*; }; f"\n`)

  try {
    await credentialReceiver()
  } catch (err) {
    errorOutput(JSON.stringify(err))
    process.exit(1)
  }

  appOutput("Ctrl+c to stop server.")
})().catch(err => {
  errorOutput(JSON.stringify(err))
  process.exit(1)
})
