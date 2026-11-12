/** Error raised by a use case; `code` is forwarded to clients as-is. */
export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'DomainError'
  }
}
