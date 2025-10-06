import { RoutesConfig } from "x402-express";

// x402 payment configuration for Base Sepolia
export const paymentConfig: RoutesConfig = {
  "POST /api/shorten": {
    price: "$0.001-$0.01", // 0.001 to 0.01 USDC range
    network: "base-sepolia",
    asset: {
      address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`,
      decimals: 6,
      eip712: {
        name: "USDC",
        version: "2",
      },
    },
    config: {
      description:
        "URL shortening service - Create shortened URLs with blockchain payment verification",
      mimeType: "application/json",
      maxTimeoutSeconds: 300,
    },
  },
};

// Base Sepolia USDC contract address
export const USDC_CONTRACT_ADDRESS =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// Payment requirements configuration
export const PAYMENT_REQUIREMENTS = {
  scheme: "range" as const,
  network: "base-sepolia",
  minAmountRequired: "1000", // 0.001 USDC in atomic units (6 decimals)
  maxAmountRequired: "10000", // 0.01 USDC in atomic units (6 decimals)
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
    process.env.FACILITATOR_URL || "https://x402.org/facilitator";

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
