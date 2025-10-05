import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export function createError(
  message: string,
  statusCode: number,
  code?: string,
): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.isOperational = true;
  return error;
}

export function errorHandler(
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Log error details
  console.error("Error occurred:", {
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    code: error.code,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Determine status code
  const statusCode = error.statusCode || 500;

  // Determine error code
  const errorCode = error.code || "INTERNAL_ERROR";

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === "development";

  const errorResponse = {
    success: false,
    error: isDevelopment ? error.message : "Internal server error",
    code: errorCode,
    ...(isDevelopment && { stack: error.stack }),
  };

  res.status(statusCode).json(errorResponse);
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    code: "NOT_FOUND",
    path: req.path,
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
