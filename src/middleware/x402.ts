import { Request, Response, NextFunction } from "express";
import { paymentMiddleware } from "x402-express";
import { paymentConfig, getPaymentConfig } from "../config/payment";

// Initialize x402 middleware with Base Sepolia configuration
export const initializeX402Middleware = () => {
  const config = getPaymentConfig();

  // Configure x402 middleware with payment requirements
  return paymentMiddleware(
    config.businessWalletAddress as `0x${string}`,
    paymentConfig,
    {
      url: config.facilitatorUrl as `${string}://${string}`,
    },
  );
};

// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      paymentData?: {
        txHash: string;
        creatorAddress: string;
        amount: string;
        asset: string;
        network: string;
      };
    }
  }
}
