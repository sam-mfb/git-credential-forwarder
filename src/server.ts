import http from "http"
import * as fs from "fs"
import { promisify } from "util"

const socketPath = "/tmp/node-server.sock"

interface ListenArgs {
  path: string
  backlog?: number // Maximum length of the queue of pending connections. The actual length will be determined by the OS through sysctl settings such as tcp_max_syn_backlog and somaxconn on linux. The default value of this parameter is 511 (not documented).
}

const unlinkAsync = promisify(fs.unlink)

const server = http.createServer(socket => {
  socket.on("data", data => {
    console.log(data.toString())
  })
})

async function listen({ path, backlog = 511 }: ListenArgs): Promise<void> {
  try {
    await unlinkAsync(path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Error removing old socket:", error)
      process.exit(1)
    }
  }

  server.listen({ path, backlog }, () => {
    console.log(`Server listening on ${path}`)
  })
}

listen({ path: socketPath }).catch(error => {
  console.error("Failed to start server:", error)
})
