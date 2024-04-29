/*
 * Enum-like constant for holding git credential helper operation strings
 */
export const gitCredentialHelperOperation = {
  GET: "get",
  STORE: "store",
  ERASE: "erase"
} as const

/*
 * Operations that git credential helper may receive per https://git-scm.com/docs/gitcredentials
 * get - Return a matching credential, if any exists.
 * store - Store the credential, if applicable to the helper.
 * erase - Remove matching credentials, if any, from the helper’s storage.
 *
 * Note from the link above:
 * - If a helper fails to perform the requested operation or needs to notify the user of a potential issue, it may write to stderr.
 * - If it does not support the requested operation (e.g., a read-only store or generator), it should silently ignore the request.
 * - If a helper receives any other operation, it should silently ignore the request. This leaves room for future operations to be added (older helpers will just ignore the new requests).
 */
export type GitCredentialHelperOperation = ConstRecordToType<
  typeof gitCredentialHelperOperation
>

/*
 * Expected output of git credential helper operations per https://git-scm.com/docs/gitcredentials
 *
 * Note from the link above:
 * - While it is possible to override all attributes, well behaving helpers should refrain from doing so for any attribute other than username and password.
 * - If a helper outputs a quit attribute with a value of true or 1, no further helpers will be consulted, nor will the user be prompted (if no credential has been provided, the operation will then fail).
 * - Similarly, no more helpers will be consulted once both username and password had been provided.
 * - For a store or erase operation, the helper’s output is ignored.
 */
export type GitCredentialHelperOutput<
  TOperation extends GitCredentialHelperOperation
> = TOperation extends (typeof gitCredentialHelperOperation)["GET"]
  ? GitCredentialInputOutput & { quit?: true | 1 }
  : null

/*
 * Enum-like constant for holding git credential action strings
 */
export const gitCredentialAction = {
  FILL: "fill",
  APPROVE: "approve",
  REJECT: "reject"
} as const

/*
 * Actions that git-credential (as opposed to a git credential helper) may receive per https://git-scm.com/docs/git-credential
 * fill - git-credential will attempt to add "username" and "password" attributes to the description by reading config files, by contacting any configured credential helpers, or by prompting the user. The username and password attributes of the credential description are then printed to stdout together with the attributes already provided.
 * approve - git-credential will send the description to any configured credential helpers, which may store the credential for later use.\
 * action is reject - git-credential will send the description to any configured credential helpers, which may erase any stored credentials matching the description.
 */
export type GitCredentialAction = ConstRecordToType<typeof gitCredentialAction>

/*
 * Expected output of git credential actions per https://git-scm.com/docs/git-credential
 * - If the action is fill, git-credential will attempt to add "username" and "password" attributes to the description
 * - If the action is approve or reject, no output should be emitted.
 */
export type GitCredentialOutput<TAction extends GitCredentialAction> =
  TAction extends (typeof gitCredentialAction)["FILL"]
    ? GitCredentialInputOutput
    : null

export const gitCredentialIoKeys = [
  "protocol",
  "host",
  "path",
  "username",
  "password",
  "password_expiry_utc",
  "oauth_refresh_token",
  "url",
  "wwwauth"
]

/*
 * Input/output format for git-credential and git credential helpers as specified here https://git-scm.com/docs/git-credential
 */
export type GitCredentialInputOutput = {
  /**
   * The protocol over which the credential will be used (e.g., https).
   */
  protocol?: string

  /**
   * The remote hostname for a network credential. This includes the port number if one was specified (e.g., "example.com:8088").
   */
  host?: string

  /**
   * The path with which the credential will be used. E.g., for accessing a remote https repository, this will be the repository’s path on the server.
   */
  path?: string

  /**
   * The credential’s username, if we already have one (e.g., from a URL, the configuration, the user, or from a previously run helper).
   */
  username?: string

  /**
   * The credential’s password, if we are asking it to be stored.
   */
  password?: string

  /**
   * Generated passwords such as an OAuth access token may have an expiry date. When reading credentials from helpers, git credential fill ignores expired passwords. Represented as Unix time UTC, seconds since 1970.
   */
  password_expiry_utc?: number

  /**
   * An OAuth refresh token may accompany a password that is an OAuth access token. Helpers must treat this attribute as confidential like the password attribute. Git itself has no special behaviour for this attribute.
   */
  oauth_refresh_token?: string

  /**
   * When this special attribute is read by git credential, the value is parsed as a URL and treated as if its constituent parts were read (e.g., url=https://example.com would behave as if protocol=https and host=example.com had been provided). This can help callers avoid parsing URLs themselves.
   */
  url?: string

  /**
   * When an HTTP response is received by Git that includes one or more WWW-Authenticate authentication headers, these will be passed by Git to credential helpers. Each WWW-Authenticate header value is passed as a multi-valued attribute wwwauth[], where the order of the attributes is the same as they appear in the HTTP response. This attribute is one-way from Git to pass additional information to credential helpers.
   */
  wwwauth?: string[]
}

type ConstRecordToType<T extends Record<string, string>> = {
  [K in keyof T]: T[K]
}[keyof T]
