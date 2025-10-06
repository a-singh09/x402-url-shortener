import { Request, Response } from "express";
import { getPaymentConfig, PAYMENT_REQUIREMENTS } from "../config/payment";

export interface PaymentData {
  txHash: string;
  creatorAddress: string;
  amount: string;
  asset: string;
  network: string;
  timestamp: number;
}

export interface PaymentVerificationResult {
  isValid: boolean;
  error?: string;
  paymentData?: PaymentData;
}

export class PaymentHandler {
  private config: ReturnType<typeof getPaymentConfig>;

  constructor() {
    this.config = getPaymentConfig();
  }

  /**
   * Verify payment data from x402 middleware
   */
  verifyPayment(paymentData: any): PaymentVerificationResult {
    try {
      // Validate required payment fields
      if (!paymentData) {
        return {
          isValid: false,
          error: "No payment data provided",
        };
      }

      const { txHash, creatorAddress, amount, asset, network } = paymentData;

      // Validate required fields
      if (!txHash || !creatorAddress || !amount || !asset || !network) {
        return {
          isValid: false,
          error: "Missing required payment fields",
        };
      }

      // Validate network
      if (network !== PAYMENT_REQUIREMENTS.network) {
        return {
          isValid: false,
          error: `Invalid network. Expected ${PAYMENT_REQUIREMENTS.network}, got ${network}`,
        };
      }

      // Validate asset (USDC contract address)
      if (asset.toLowerCase() !== PAYMENT_REQUIREMENTS.asset.toLowerCase()) {
        return {
          isValid: false,
          error: `Invalid asset. Expected ${PAYMENT_REQUIREMENTS.asset}, got ${asset}`,
        };
      }

      // Validate payment amount (range: 0.001 to 0.01 USDC)
      const paymentAmount = parseInt(amount, 10);
      const minAmount = parseInt(PAYMENT_REQUIREMENTS.minAmountRequired, 10);
      const maxAmount = parseInt(PAYMENT_REQUIREMENTS.maxAmountRequired, 10);

      if (paymentAmount < minAmount) {
        return {
          isValid: false,
          error: `Payment amount too low. Minimum: ${minAmount} (0.001 USDC), received: ${paymentAmount}`,
        };
      }

      if (paymentAmount > maxAmount) {
        return {
          isValid: false,
          error: `Payment amount too high. Maximum: ${maxAmount} (0.01 USDC), received: ${paymentAmount}`,
        };
      }

      // Validate transaction hash format (should be 32-byte hex string)
      if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        return {
          isValid: false,
          error: "Invalid transaction hash format",
        };
      }

      // Validate creator address format (should be 20-byte hex string)
      if (!/^0x[a-fA-F0-9]{40}$/.test(creatorAddress)) {
        return {
          isValid: false,
          error: "Invalid creator address format",
        };
      }

      return {
        isValid: true,
        paymentData: {
          txHash,
          creatorAddress,
          amount,
          asset,
          network,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Payment verification error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Extract payment data from request headers
   */
  extractPaymentFromRequest(req: Request): PaymentData | null {
    try {
      // Payment data should be attached by x402 middleware
      if (req.paymentData) {
        return {
          ...req.paymentData,
          timestamp: Date.now(),
        };
      }

      // Fallback: try to extract from X-PAYMENT header
      const paymentHeader = req.headers["x-payment"] as string;
      if (paymentHeader) {
        // Decode base64 payment data
        const paymentJson = Buffer.from(paymentHeader, "base64").toString(
          "utf-8",
        );
        const paymentData = JSON.parse(paymentJson);

        return {
          txHash: paymentData.txHash,
          creatorAddress: paymentData.creatorAddress,
          amount: paymentData.amount,
          asset: paymentData.asset,
          network: paymentData.network,
          timestamp: Date.now(),
        };
      }

      return null;
    } catch (error) {
      console.error("Error extracting payment data:", error);
      return null;
    }
  }

  /**
   * Handle payment settlement response
   */
  handleSettlementResponse(settlementData: any): {
    success: boolean;
    error?: string;
  } {
    try {
      if (!settlementData) {
        return { success: false, error: "No settlement data received" };
      }

      // Check settlement status
      if (settlementData.status === "settled") {
        console.log("Payment settled successfully:", {
          txHash: settlementData.txHash,
          blockNumber: settlementData.blockNumber,
          timestamp: settlementData.timestamp,
        });
        return { success: true };
      }

      if (settlementData.status === "failed") {
        return {
          success: false,
          error: settlementData.error || "Payment settlement failed",
        };
      }

      if (settlementData.status === "pending") {
        return {
          success: false,
          error: "Payment settlement is still pending",
        };
      }

      return {
        success: false,
        error: `Unknown settlement status: ${settlementData.status}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Settlement processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Create payment response headers for successful transactions
   */
  createPaymentResponseHeaders(
    paymentData: PaymentData,
  ): Record<string, string> {
    const responseData = {
      txHash: paymentData.txHash,
      network: paymentData.network,
      amount: paymentData.amount,
      asset: paymentData.asset,
      timestamp: paymentData.timestamp,
    };

    return {
      "X-PAYMENT-RESPONSE": Buffer.from(JSON.stringify(responseData)).toString(
        "base64",
      ),
      "X-PAYMENT-TX-HASH": paymentData.txHash,
      "X-PAYMENT-NETWORK": paymentData.network,
    };
  }

  /**
   * Validate payment requirements configuration
   */
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.businessWalletAddress) {
      errors.push("Business wallet address is not configured");
    }

    if (!this.config.facilitatorUrl) {
      errors.push("Facilitator URL is not configured");
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(this.config.businessWalletAddress || "")) {
      errors.push("Invalid business wallet address format");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
