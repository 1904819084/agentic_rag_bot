export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(code: string, status = 500, message = code) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}
