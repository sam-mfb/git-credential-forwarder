import { CredentialOperationHandler } from "./client/types"

export function buildCredentialForwarder(args: {
  socketPath: string
  vsCodeCompatible: boolean
}): CredentialOperationHandler
