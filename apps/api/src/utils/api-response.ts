import type { Response } from "express";

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  data: T,
  meta: Record<string, unknown> = {},
): void {
  res.status(statusCode).json({ data, error: null, meta });
}

export function sendFailure(
  res: Response,
  statusCode: number,
  error: ApiError,
  meta: Record<string, unknown> = {},
): void {
  res.status(statusCode).json({ data: null, error, meta });
}
