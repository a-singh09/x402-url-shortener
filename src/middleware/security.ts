import { Request, Response, NextFunction } from "express";

export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Set security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", "default-src 'self'");

  // Remove server header for security
  res.removeHeader("X-Powered-By");

  next();
}

export function corsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Set CORS headers
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:3000",
  ];
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Payment, Authorization",
  );
  res.setHeader("Access-Control-Expose-Headers", "X-Payment-Response");
  res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  next();
}

export function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Simple in-memory rate limiting (for production, use Redis or similar)
  const clientIp = req.ip || req.connection.remoteAddress || "unknown";
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100; // Max requests per window

  // Initialize rate limit store if not exists
  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map();
  }

  const store = global.rateLimitStore as Map<
    string,
    { count: number; resetTime: number }
  >;
  const clientData = store.get(clientIp);

  if (!clientData || now > clientData.resetTime) {
    // Reset or initialize client data
    store.set(clientIp, { count: 1, resetTime: now + windowMs });
    next();
    return;
  }

  if (clientData.count >= maxRequests) {
    res.status(429).json({
      success: false,
      error: "Too many requests",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
    });
    return;
  }

  // Increment request count
  clientData.count++;
  store.set(clientIp, clientData);

  next();
}

// Extend global namespace for rate limit store
declare global {
  var rateLimitStore:
    | Map<string, { count: number; resetTime: number }>
    | undefined;
}
