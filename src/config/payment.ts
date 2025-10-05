import { RoutesConfig } from "x402-express";

// x402 payment configuration for Base Sepolia
export const paymentConfig: RoutesConfig = {
  "/api/shorten": {
    price: "$1.00", // 1 USDC
    network: "base-sepolia",
    config: {
      description: "URL shortening service",
    },
  },
};

// Base Sepolia USDC contract address
export const USDC_CONTRACT_ADDRESS =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// Payment requirements configuration
export const PAYMENT_REQUIREMENTS = {
  scheme: "exact" as const,
  network: "base-sepolia",
  maxAmountRequired: "1000000", // 1 USDC in atomic units (6 decimals)
  maxTimeoutSeconds: 300, // 5 minutes
  asset: USDC_CONTRACT_ADDRESS,
  extra: {
    name: "USDC",
    version: "2",
  },
};

// Environment configuration
export const getPaymentConfig = () => {
  const businessWalletAddress = process.env.BUSINESS_WALLET_ADDRESS;
  const facilitatorUrl =
    process.env.FACILITATOR_URL || "https://facilitator.x402.org";

  if (!businessWalletAddress) {
    throw new Error("BUSINESS_WALLET_ADDRESS environment variable is required");
  }

  return {
    businessWalletAddress,
    facilitatorUrl,
    ...PAYMENT_REQUIREMENTS,
    payTo: businessWalletAddress,
  };
};
