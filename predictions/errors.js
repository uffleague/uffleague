// An error the server sends back as-is: status, message, and optionally a code the page can act on
// (none are used right now)
export class HttpError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}
export const fail = (status, message, code) => { throw new HttpError(status, message, code); };
