import { Response } from 'express';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function handleControllerError(res: Response, error: unknown, logLabel: string) {
  if (isApiError(error)) {
    return res.status(error.status).json({ success: false, error: error.message });
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(logLabel, message);
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}
