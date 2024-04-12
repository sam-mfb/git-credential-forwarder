/*
 * Types that encode how git credential helper works per https://git-scm.com/docs/gitcredentials
 */
type GitCredentialHelperCmdMap = {
  get: {
    input: {
    protocol: string
    host: string
    path: string
    }
    output {

    }
  }
  store: null
  erase: null
}

/*
 * Commands that a git credential helper may receive from git
 */
export type GitCredentialHelperCmd = Resolve<keyof GitCredentialHelperCmdMap>

/*
 * Usable output for the command TCommand that git credential helper may receive from git
 */
export type GitCredentialHelperOutput<TCommand extends GitCredentialHelperCmd> =
  GitCredentialHelperCmdMap[TCommand]

type Resolve<T> = T extends Function ? T : { [K in keyof T]: T[K] }

type GitCredentialInputOutput = {
    protocol: string; // Protocol over which the credential will be used (e.g., "https")
         host: string; // Remote hostname with optional port (e.g., "example.com:8088")
             path?: string; // Path for the credential usage on the server (e.g., repository path)
                 username?: string; // Username associated with the credential
                     password?: string; // Password or OAuth access token
                         password_expiry_utc?: number; // Expiry date of the password in Unix time UTC
                             oauth_refresh_token?: string; // OAuth refresh token, treated confidentially
                                 url?: string; // URL that when read is treated as if its parts were provided separately
                                     wwwauth?: string[]; // Array of WWW-Authenticate header 
}
