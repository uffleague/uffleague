// An error the server sends back as-is: status, message, and optionally a code the page can act on
// (e.g. "elevate" = ask for the PIN to unlock admin tools)
export class HttpError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}
export const fail = (status, message, code) => { throw new HttpError(status, message, code); };
