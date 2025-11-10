# URL Shortener with x402 Payments

A modern URL shortening service that requires cryptocurrency payments using the x402 protocol. Built with Node.js, Express, TypeScript, and PostgreSQL.

## Live Demo



https://github.com/user-attachments/assets/fb6a9a1a-f387-4fda-9b08-faecb382022a



## 🚀 Features

- **Crypto Payments**: Requires 0.001 USDC payment per URL shortening via x402 protocol
- **Base Sepolia Network**: Uses Base Sepolia testnet for payments
- **URL Validation**: Comprehensive URL validation and security checks
- **Short Code Generation**: Generates unique, collision-resistant short codes
- **Database Storage**: Persistent storage with PostgreSQL
- **Payment Tracking**: Links each shortened URL to its payment transaction
- **RESTful API**: Clean API endpoints for URL operations
- **Health Monitoring**: Built-in health check endpoint

## 🛠 Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Aiven Cloud)
- **Payments**: x402 protocol with Base Sepolia USDC
- **Validation**: Custom URL validation and security
- **Deployment**: Docker support with deployment scripts

## 📋 Prerequisites

- Node.js 20+ (required for x402 libraries)
- PostgreSQL database
- Base Sepolia USDC for testing payments
- Crypto wallet with Base Sepolia ETH for gas fees

## 🔧 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd url-shortener-x402
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:

   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   BASE_URL=http://localhost:3000

   # Database Configuration
   DATABASE_URL=postgresql://username:password@host:port/database

   # x402 Payment Configuration
   BUSINESS_WALLET_ADDRESS=0xYourWalletAddress
   PRIVATE_KEY=0xYourPrivateKey
   FACILITATOR_URL=https://x402.org/facilitator

   # Network Configuration
   X402_NETWORK=base-sepolia
   USDC_CONTRACT_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
   ```

4. **Initialize the database**
   ```bash
   npm run dev
   ```
   The application will automatically create the necessary database tables.

## 🚀 Usage

### Starting the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

### API Endpoints

#### Shorten URL (Requires Payment)

```http
POST /api/shorten
Content-Type: application/json

{
  "url": "https://example.com"
}
```

**Payment Required**: This endpoint requires a 0.001 USDC payment via x402 protocol.

**Success Response** (after payment):

```json
{
  "success": true,
  "shortUrl": "http://localhost:3000/abc123",
  "originalUrl": "https://example.com",
  "shortCode": "abc123",
  "paymentTxHash": "0x..."
}
```

#### Redirect to Original URL

```http
GET /{shortCode}
```

Redirects to the original URL associated with the short code.

#### Get URL Statistics

```http
GET /stats/{shortCode}
```

Returns statistics for the shortened URL.

#### Health Check

```http
GET /health
```

Returns server health status.

## 💳 Payment Integration

This service uses the x402 protocol for cryptocurrency payments. Here's how it works:

### For API Users

1. **Install x402 client library**:

   ```bash
   npm install x402-fetch viem
   ```

2. **Use the payment-enabled client**:

   ```typescript
   import { wrapFetchWithPayment } from "x402-fetch";
   import { createWalletClient, http, publicActions } from "viem";
   import { privateKeyToAccount } from "viem/accounts";
   import { baseSepolia } from "viem/chains";

   // Create wallet client
   const account = privateKeyToAccount("0xYourPrivateKey");
   const client = createWalletClient({
     account,
     transport: http(),
     chain: baseSepolia,
   }).extend(publicActions);

   // Wrap fetch with payment capability
   const fetchWithPayment = wrapFetchWithPayment(fetch, client);

   // Make paid request
   const response = await fetchWithPayment(
     "http://localhost:3000/api/shorten",
     {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ url: "https://example.com" }),
     },
   );

   const result = await response.json();
   console.log("Shortened URL:", result.shortUrl);
   ```

### Payment Requirements

- **Network**: Base Sepolia testnet
- **Token**: USDC (0x036CbD53842c5426634e7929541eC2318f3dCF7e)
- **Amount**: 0.001 USDC per URL shortening
- **Gas**: Base Sepolia ETH required for transaction fees

### Getting Testnet Tokens

1. **Base Sepolia ETH**: [Coinbase Base Sepolia Faucet](https://www.coinbase.com/faucets/base-sepolia-faucet)
2. **Base Sepolia USDC**: Bridge from Ethereum Sepolia or use testnet faucets

## 🧪 Testing

### Test Client Usage

The project includes a test client that demonstrates the x402 payment integration. The test client accepts command line arguments for easy testing with different URLs.

#### Basic Usage

```bash
# Test with default URL (https://example.com)
npx tsx x402-test/test-client.ts

# Test with a specific URL (positional argument)
npx tsx x402-test/test-client.ts https://google.com

# Test with a specific URL (named argument)
npx tsx x402-test/test-client.ts --url=https://github.com

# Show help information
npx tsx x402-test/test-client.ts --help
```

#### Test Client Features

- **Flexible URL input**: Accepts URLs as positional or named arguments
- **Environment configuration**: Uses `BASE_URL` environment variable for server endpoint
- **Payment integration**: Demonstrates complete x402 payment flow
- **Response logging**: Shows both API response and payment details
- **Help documentation**: Built-in usage instructions

#### Prerequisites for Testing

1. **Set up your environment variables** in `.env`:

   ```env
   PRIVATE_KEY=0xYourPrivateKeyWithBaseSepolia
   BASE_URL=https://x402-url-shortener.onrender.com
   ```

2. **Ensure you have Base Sepolia tokens**:

   - Base Sepolia ETH for gas fees
   - Base Sepolia USDC for payments (0.001 USDC per request)

3. **Start your server**:
   ```bash
   npm run dev
   ```

#### Example Output

```bash
$ npx tsx x402-test/test-client.ts https://github.com
Using base URL: http://localhost:3000
URL to shorten: https://github.com
Success! {
  success: true,
  shortUrl: "http://localhost:3000/abc123",
  originalUrl: "https://github.com",
  shortCode: "abc123",
  paymentTxHash: "0x..."
}
Payment details: {
  txHash: "0x...",
  amount: "1000",
  token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
}
```

### Test the Payment Flow

1. **Test the payment integration**:
   ```bash
   npx tsx x402-test/test-client.ts
   ```

### Manual Testing with curl

1. **Test without payment** (should return 402):

   ```bash
   curl -X POST http://localhost:3000/api/shorten \
     -H "Content-Type: application/json" \
     -d '{"url":"https://example.com"}'
   ```

2. **Test redirect**:
   ```bash
   curl -L http://localhost:3000/{shortCode}
   ```

## 🏗 Project Structure

```
├── src/
│   ├── config/           # Configuration files
│   ├── database/         # Database connection and migrations
│   ├── middleware/       # Express middleware (x402, security, logging)
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic services
│   └── startup.ts        # Application startup
├── x402-test/            # Payment testing utilities
├── scripts/              # Deployment and utility scripts
└── README.md
```

## 🔒 Security Features

- **URL Validation**: Prevents malicious URLs and validates formats
- **Rate Limiting**: Protects against abuse
- **CORS Protection**: Configurable cross-origin resource sharing
- **Security Headers**: Comprehensive security headers
- **Payment Verification**: Cryptographic payment verification via x402

## 🚢 Deployment

### Render Deployment

1. **Connect your GitHub repository** to Render

2. **Create a new Web Service** with these settings:

   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: 20+

3. **Set Environment Variables** in Render dashboard:

   ```
   NODE_ENV=production
   DATABASE_URL=your_aiven_database_url
   BUSINESS_WALLET_ADDRESS=your_wallet_address
   FACILITATOR_URL=https://x402.org/facilitator
   X402_NETWORK=base-sepolia
   USDC_CONTRACT_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
   ```

4. **For Aiven Database SSL** (recommended):

   - Copy the contents of your `ca.pem` file
   - Add as environment variable: `DATABASE_CA_CERT=-----BEGIN CERTIFICATE-----\nYOUR_CERT_CONTENT\n-----END CERTIFICATE-----`
   - Replace actual newlines with `\n` in the certificate content

5. **Deploy**: Render will automatically build and deploy your application

### Using Docker

```bash
# Build the image
docker build -t url-shortener-x402 .

# Run the container
docker run -p 3000:3000 --env-file .env url-shortener-x402
```

### Using the deployment script

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## 📊 Environment Variables

| Variable                  | Description                                | Required | Default                      |
| ------------------------- | ------------------------------------------ | -------- | ---------------------------- |
| `PORT`                    | Server port                                | No       | 3000                         |
| `NODE_ENV`                | Environment mode                           | No       | development                  |
| `DATABASE_URL`            | PostgreSQL connection string               | Yes      | -                            |
| `BUSINESS_WALLET_ADDRESS` | Your wallet address for receiving payments | Yes      | -                            |
| `PRIVATE_KEY`             | Private key for testing (keep secure!)     | Yes      | -                            |
| `FACILITATOR_URL`         | x402 facilitator URL                       | No       | https://x402.org/facilitator |
| `BASE_URL`                | Base URL for shortened links               | No       | http://localhost:3000        |

**Note**: This is a testnet implementation using Base Sepolia. For production use, update the configuration to use Base mainnet and real USDC.
