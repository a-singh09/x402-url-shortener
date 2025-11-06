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

// Get base URL from environment
const baseUrl = process.env.BASE_URL || "http://localhost:3000";
console.log(`Using base URL: ${baseUrl}`);

// Get URL to shorten from command line arguments
const args = process.argv.slice(2);

// Check for help flag
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: npx tsx x402-test/test-client.ts [URL] [options]

Arguments:
  URL                    The URL to shorten (default: https://example.com)

Options:
  --url=URL             Alternative way to specify the URL
  --help, -h            Show this help message

Examples:
  npx tsx x402-test/test-client.ts https://google.com
  npx tsx x402-test/test-client.ts --url=https://github.com
  `);
  process.exit(0);
}

const urlToShorten =
  args.find((arg) => arg.startsWith("--url="))?.split("=")[1] ||
  args.find((arg) => !arg.startsWith("--")) ||
  "https://example.com";

console.log(`URL to shorten: ${urlToShorten}`);

// Helper function to format payment amount
function formatPaymentAmount(amountWei: string): string {
  const amount = BigInt(amountWei);
  const usdcDecimals = 6;
  const divisor = BigInt(10 ** usdcDecimals);

  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;

  const fractionalStr = fractionalPart.toString().padStart(usdcDecimals, "0");
  return `${wholePart}.${fractionalStr} USDC`;
}

// Create wallet client
const account = privateKeyToAccount(privateKey as `0x${string}`);
const client = createWalletClient({
  account,
  transport: http(),
  chain: baseSepolia,
}).extend(publicActions);

// Wrap fetch with payment capability
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

// Test your service
fetchWithPayment(`${baseUrl}/api/shorten`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: urlToShorten,
  }),
})
  .then(async (response) => {
    console.log(`Response status: ${response.status} ${response.statusText}`);

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.log("Non-JSON response received:");
      console.log(text.substring(0, 500) + (text.length > 500 ? "..." : ""));
      return;
    }

    const body = await response.json();
    console.log("Success!", body);

    // Check payment details
    const paymentHeader = response.headers.get("x-payment-response");
    if (paymentHeader && paymentHeader.trim() !== "") {
      try {
        const paymentResponse = decodeXPaymentResponse(paymentHeader);
        console.log("Payment details:", paymentResponse);

        // Show transaction hash with link (using correct property name)
        if (paymentResponse.transaction) {
          console.log(
            `🔗 Transaction: https://sepolia.basescan.org/tx/${paymentResponse.transaction}`,
          );
        }

        // Show network and payer info
        if (paymentResponse.network) {
          console.log(`🌐 Network: ${paymentResponse.network}`);
        }
        if (paymentResponse.payer) {
          console.log(`👤 Payer: ${paymentResponse.payer}`);
        }
      } catch (error) {
        console.log("Could not decode payment response header:", paymentHeader);
        console.log("Decode error:", error.message);
      }
    } else {
      console.log("No payment response header found or header is empty");
    }
  })
  .catch((error) => {
    console.error("Error:", error);
  });
