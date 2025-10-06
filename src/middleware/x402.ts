import { paymentMiddleware } from "x402-express";

// Initialize x402 middleware with Base Sepolia configuration
export const initializeX402Middleware = () => {
  return paymentMiddleware(
    process.env.BUSINESS_WALLET_ADDRESS as `0x${string}`,
    {
      "POST /api/shorten": {
        price: "$0.001", // 0.001 USDC per URL shortening
        network: "base-sepolia",
      },
    },
    {
      url: "https://x402.org/facilitator", // Base Sepolia testnet facilitator
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
