import type http from "http"
import { CredentialOperationHandler } from "../types"

export function buildCredentialReceiver(deps: {
  server: http.Server
  socketPath: string
  vsCodeCompatible?: boolean
  onExit: {
    success: () => void
    failure: () => void
  }
  credentialOperationHandler: CredentialOperationHandler
  debugger?: (str: string) => void
}): () => void {
  return () => {}
}
