import { Request, Response, NextFunction } from "express";

export interface LogEntry {
  timestamp: string;
  method: string;
  url: string;
  statusCode?: number;
  responseTime?: number;
  userAgent?: string;
  ip?: string;
  paymentTxHash?: string;
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startTime = Date.now();

  // Log request
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.headers["user-agent"],
    ip: req.ip || req.connection.remoteAddress,
  };

  console.log("Request:", logEntry);

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any): Response {
    const responseTime = Date.now() - startTime;

    // Log response
    console.log("Response:", {
      ...logEntry,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      paymentTxHash: res.getHeader("X-PAYMENT-RESPONSE")
        ? "present"
        : undefined,
    });

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
}

export function paymentLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Log payment-related requests
  if (req.path === "/api/shorten" && req.method === "POST") {
    const paymentHeader = req.headers["x-payment"];

    console.log("Payment request:", {
      timestamp: new Date().toISOString(),
      hasPaymentHeader: !!paymentHeader,
      url: req.body?.url ? "present" : "missing",
      ip: req.ip || req.connection.remoteAddress,
    });
  }

  next();
}
