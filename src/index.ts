import express from "express";
import { initializeX402Middleware } from "./middleware/x402";
import { PaymentHandler } from "./services/payment-handler";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { requestLogger, paymentLogger } from "./middleware/logging";
import {
  securityHeaders,
  corsHandler,
  rateLimiter,
} from "./middleware/security";
import routes from "./routes";

// Main application entry point
console.log("URL Shortener with x402 Payment Integration");

const app = express();
const port = process.env.PORT || 3000;

// Initialize payment handler
const paymentHandler = new PaymentHandler();

// Validate payment configuration on startup
const configValidation = paymentHandler.validateConfiguration();
if (!configValidation.isValid) {
  console.error("Payment configuration errors:", configValidation.errors);
  process.exit(1);
}

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

// Apply x402 middleware only to the shorten endpoint
app.use("/api/shorten", x402Middleware);

// API routes
app.use(routes);

// 404 handler for unknown routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log("x402 payment integration configured successfully");
    console.log("Payment handler initialized and ready");
  });
}

export { app, paymentHandler };
