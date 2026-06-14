import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, 404, "Route not found");
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AppError) {
    sendError(res, error.statusCode, error.message, error.details);
    return;
  }

  const message = error instanceof Error ? error.message : "Internal server error";
  console.error("Unhandled error:", error);
  sendError(res, 500, "Internal server error", message);
}
