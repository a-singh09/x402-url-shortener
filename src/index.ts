import express from "express";
import { initializeX402Middleware } from "./middleware/x402";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { requestLogger, paymentLogger } from "./middleware/logging";
import {
  securityHeaders,
  corsHandler,
  rateLimiter,
} from "./middleware/security";
import routes from "./routes";

const app = express();

// Trust proxy for accurate IP addresses
app.set("trust proxy", true);

// Security middleware (applied first)
app.use(securityHeaders);
app.use(corsHandler);
app.use(rateLimiter);

// Request parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging middleware
app.use(requestLogger);
app.use(paymentLogger);

// Initialize x402 payment middleware for protected endpoints
const x402Middleware = initializeX402Middleware();

// Apply x402 middleware
app.use(x402Middleware);

// API routes
app.use(routes);

// 404 handler for unknown routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export { app };

if (require.main === module) {
  import("./startup.js").then(({ startApplication }) => {
    startApplication().catch((error: Error) => {
      console.error("❌ Failed to start application:", error);
      process.exit(1);
    });
  });
}
