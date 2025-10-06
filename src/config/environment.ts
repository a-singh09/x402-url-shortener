import { config } from "dotenv";
import fs from "fs";
import path from "path";

config();

export interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;

  // x402 Payment Configuration
  businessWalletAddress: string;
  facilitatorUrl: string;
  x402Network: string;

  // Base Sepolia Configuration
  usdcContractAddress: string;

  // Application Settings
  maxUrlLength: number;
  shortCodeLength: number;
  paymentTimeoutSeconds: number;
  maxPaymentAmount: string;
}

/**
 * Validates required environment variables and provides defaults
 */
function validateEnvironment(): EnvironmentConfig {
  const errors: string[] = [];

  // Server Configuration
  const port = parseInt(process.env.PORT || "3000", 10);
  const nodeEnv = process.env.NODE_ENV || "development";

  // Database Configuration
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    errors.push("DATABASE_URL is required");
  }

  // x402 Payment Configuration
  const businessWalletAddress = process.env.BUSINESS_WALLET_ADDRESS;

  const facilitatorUrl =
    process.env.FACILITATOR_URL || "https://x402.org/facilitator";
  try {
    new URL(facilitatorUrl);
  } catch {
    errors.push("FACILITATOR_URL must be a valid URL");
  }

  const x402Network = process.env.X402_NETWORK || "base-sepolia";

  const usdcContractAddress =
    process.env.USDC_CONTRACT_ADDRESS ||
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  if (!/^0x[a-fA-F0-9]{40}$/.test(usdcContractAddress)) {
    errors.push("USDC_CONTRACT_ADDRESS must be a valid Ethereum address");
  }

  // Application Settings with defaults
  const maxUrlLength = parseInt(process.env.MAX_URL_LENGTH || "2048", 10);
  const shortCodeLength = parseInt(process.env.SHORT_CODE_LENGTH || "8", 10);
  const paymentTimeoutSeconds = parseInt(
    process.env.PAYMENT_TIMEOUT_SECONDS || "300",
    10,
  );
  const maxPaymentAmount = process.env.MAX_PAYMENT_AMOUNT || "10000"; // 0.01 USDC in atomic units

  if (errors.length > 0) {
    throw new Error(`Environment configuration errors:\n${errors.join("\n")}`);
  }

  return {
    port,
    nodeEnv,
    databaseUrl: databaseUrl!,
    businessWalletAddress: businessWalletAddress!,
    facilitatorUrl,
    x402Network,
    usdcContractAddress,
    maxUrlLength,
    shortCodeLength,
    paymentTimeoutSeconds,
    maxPaymentAmount,
  };
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return validateEnvironment();
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Get database configuration based on environment
 */
export function getDatabaseConfig() {
  const config = getEnvironmentConfig();

  // Check if using a cloud database (Aiven, AWS RDS, etc.) that requires SSL
  const isCloudDatabase =
    config.databaseUrl.includes("aivencloud.com") ||
    config.databaseUrl.includes("amazonaws.com") ||
    config.databaseUrl.includes("supabase.com") ||
    config.databaseUrl.includes("planetscale.com");

  // Configure SSL based on environment and database type
  let sslConfig: any = false;

  if (isProduction() || isCloudDatabase) {
    // For Aiven cloud database, check for CA certificate in environment variable first
    if (config.databaseUrl.includes("aivencloud.com")) {
      const caCert = process.env.DATABASE_CA_CERT;

      if (caCert) {
        // Use CA certificate from environment variable
        sslConfig = {
          rejectUnauthorized: false, // Allow self-signed certs in chain
          ca: caCert,
        };
      }
    } else {
      // For other cloud providers, use standard SSL
      sslConfig = { rejectUnauthorized: false };
    }
  }

  return {
    url: config.databaseUrl,
    ssl: sslConfig,
    max: isProduction() ? 20 : 5, // Connection pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

/**
 * Get x402 payment configuration
 */
export function getPaymentConfig() {
  const config = getEnvironmentConfig();

  return {
    network: config.x402Network,
    businessWalletAddress: config.businessWalletAddress,
    facilitatorUrl: config.facilitatorUrl,
    usdcContractAddress: config.usdcContractAddress,
    maxPaymentAmount: config.maxPaymentAmount,
    paymentTimeoutSeconds: config.paymentTimeoutSeconds,
  };
}

// Export the validated configuration as default
export const environment = getEnvironmentConfig();
