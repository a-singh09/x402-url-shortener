import express from "express";
import { initializeX402Middleware } from "./middleware/x402";
import { PaymentHandler } from "./services/payment-handler";

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

// Middleware setup
app.use(express.json());

// Initialize x402 payment middleware
const x402Middleware = initializeX402Middleware();

// Example of how the x402 middleware would be used
// This will be fully implemented in task 5 (API endpoints)
app.use("/api/shorten", x402Middleware);

console.log("x402 payment integration configured successfully");
console.log("Payment handler initialized and ready");

export { app, paymentHandler };
