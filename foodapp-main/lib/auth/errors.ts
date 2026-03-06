export class AuthError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number = 400, code: string = "AUTH_ERROR") {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.code = code;
  }
}
