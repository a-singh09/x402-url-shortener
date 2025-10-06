import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from parent directory
config({ path: resolve(__dirname, "../.env") });

// Create wallet (you'll need a private key with Base Sepolia USDC)
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  throw new Error("PRIVATE_KEY environment variable is required");
}

// Create wallet client following x402 documentation
const account = privateKeyToAccount(privateKey as `0x${string}`);
const client = createWalletClient({
  account,
  transport: http(),
  chain: baseSepolia,
}).extend(publicActions);

// Wrap fetch with payment capability
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

// Test your service
fetchWithPayment("http://localhost:3000/api/shorten", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: "https://example.com",
  }),
})
  .then(async (response) => {
    const body = await response.json();
    console.log("Success!", body);

    // Check payment details
    const paymentHeader = response.headers.get("x-payment-response");
    if (paymentHeader) {
      const paymentResponse = decodeXPaymentResponse(paymentHeader);
      console.log("Payment details:", paymentResponse);
    }
  })
  .catch((error) => {
    console.error("Error:", error);
  });
