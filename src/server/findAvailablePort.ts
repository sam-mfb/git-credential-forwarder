import { createServer } from "http"
import { promisify } from "util"

export const findAvailablePort = async (host: string): Promise<number> => {
  const port = Math.floor(Math.random() * (65535 - 1024 + 1) + 1024) // Random non-privileged port
  return new Promise<number>(resolve => {
    const server = createServer()
    server
      .listen(port, () => {
        server.close(async () => {
          // make sure server has had time to close
          await promisify(setTimeout)(250)
          resolve(port)
        })
      })
      .on("error", () => {
        resolve(findAvailablePort(host))
      })
  })
}
