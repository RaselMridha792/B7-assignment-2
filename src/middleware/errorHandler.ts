import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response";

/**
 * Operational error carrying an HTTP status code. Route handlers can throw
 * `new AppError(404, "Issue not found")` and it will be rendered with the
 * correct status by the centralized error handler below.
 */
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

// 404 fallback for unmatched routes.
export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, 404, "Route not found");
}

// Centralized error handler — catches both thrown sync errors and async
// errors forwarded via next() (see asyncHandler). Must keep 4 params so
// Express recognizes it as an error-handling middleware.
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AppError) {
    sendError(res, error.statusCode, error.message, error.details);
    return;
  }

  const message = error instanceof Error ? error.message : "Internal server error";
  console.error("Unhandled error:", error);
  sendError(res, 500, "Internal server error", message);
}
