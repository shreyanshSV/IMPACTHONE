# 🔐 Document Verification Portal

A secure, blockchain-powered document verification system with IPFS storage, OCR processing, and MetaMask integration.

## ✨ Features

- **🔍 Document Verification**: Upload and verify documents using OCR and blockchain
- **⛓️ Blockchain Integration**: Ethereum Sepolia testnet for immutable records
- **🌐 IPFS Storage**: Decentralized document storage via Pinata
- **📱 QR Code Generation**: Generate QR codes for document verification
- **🦊 MetaMask Integration**: Wallet-based document access control
- **📊 Analytics Dashboard**: Real-time statistics and visualizations
- **📂 Document Inventory**: Manage and view verified documents
- **🔐 Secure Authentication**: Session-based user authentication

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, MongoDB
- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **Blockchain**: Web3.js, Ethereum Sepolia Testnet
- **Storage**: IPFS via Pinata
- **OCR**: Tesseract.js
- **Charts**: Chart.js
- **Authentication**: Express Session + MongoDB Store

## 📋 Prerequisites

Before setting up the project, ensure you have:

- **Node.js** (v18 or higher)
- **MongoDB Atlas** account
- **Infura** account (for Ethereum access)
- **Pinata** account (for IPFS)
- **MetaMask** wallet with Sepolia testnet ETH

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd docV
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

```bash
# Copy the environment template
cp .env.example .env

# Edit .env with your actual credentials
# Use any text editor to fill in the values
```

### 4. Required Services Setup

#### MongoDB Atlas

1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string and add to `MONGODB_URI`

#### Infura (Ethereum Access)

1. Create account at [Infura](https://infura.io/)
2. Create new project
3. Get Sepolia endpoint URL and add to `WEB3_PROVIDER_URL`

#### Pinata (IPFS Storage)

1. Create account at [Pinata](https://pinata.cloud/)
2. Get API keys from dashboard
3. Add `PINATA_API_KEY` and `PINATA_SECRET_API_KEY`

#### Ethereum Wallet

1. Create Ethereum wallet (use MetaMask)
2. Get Sepolia testnet ETH from [faucet](https://sepoliafaucet.com/)
3. Add `ACCOUNT_ADDRESS` and `PRIVATE_KEY` to .env

### 5. Start the Server

```bash
node server.js
```

The server will start on http://localhost:5000

## 📁 Project Structure

```
docV/
├── server.js                 # Main server file
├── package.json              # Dependencies and scripts
├── .env.example              # Environment variables template
├── frontend/                 # Vanilla JS frontend
│   ├── index.html           # Main HTML file
│   ├── script.js            # JavaScript functionality
│   └── style.css            # Styling
├── src/                     # React components (reference)
├── eng.traineddata          # OCR language data
└── README.md               # This file
```

## 🔧 Environment Variables

| Variable                | Description               | Example                                          |
| ----------------------- | ------------------------- | ------------------------------------------------ |
| `MONGODB_URI`           | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `PORT`                  | Server port               | `3000`                                           |
| `SESSION_SECRET`        | Session encryption key    | `your-secret-key-32-chars-min`                   |
| `WEB3_PROVIDER_URL`     | Ethereum RPC endpoint     | `https://sepolia.infura.io/v3/your-id`           |
| `ACCOUNT_ADDRESS`       | Ethereum wallet address   | `0xYourAddress`                                  |
| `PRIVATE_KEY`           | Ethereum private key      | `your-private-key`                               |
| `PINATA_API_KEY`        | Pinata API key            | `your-api-key`                                   |
| `PINATA_SECRET_API_KEY` | Pinata secret key         | `your-secret-key`                                |

## 🧪 Testing

The project includes test documents for verification:

- `BC-2023-001`, `BC-2023-002` (Birth Certificates)
- `EC-2023-001`, `EC-2023-002` (Educational Certificates)
- `PD-2023-001`, `PD-2023-002` (Property Documents)
- `ID-2023-001`, `ID-2023-002` (Identity Documents)
- `TEST-001`, `TEST-002` (Test Documents)

## 🔐 Security Features

- **Environment Variables**: Sensitive data stored in .env (not committed)
- **Session Management**: Secure session handling with MongoDB store
- **Wallet Verification**: MetaMask signature verification for document access
- **CORS Protection**: Configured for secure cross-origin requests
- **Input Validation**: Server-side validation for all inputs

## 🚨 Important Security Notes

- **Never commit .env file** to version control
- **Keep private keys secure** and never share them
- **Use testnet only** for development
- **Rotate API keys** regularly
- **Use strong session secrets** (minimum 32 characters)

## 📱 Usage

1. **Sign Up/Sign In**: Create account or log in
2. **Verify Document**: Upload document with reference number
3. **Get QR Code**: Receive QR code for verification
4. **Scan QR**: Use QR scanner to verify documents
5. **MetaMask Verification**: Link wallet for secure access
6. **View Inventory**: Check all verified documents
7. **Analytics**: View verification statistics

## 🐛 Troubleshooting

### Common Issues:

**Port 3000 already in use**

```bash
# Kill process using port 3000
npx kill-port 3000
# Or use different port in .env
PORT=3001
```

**MongoDB connection failed**

- Check MONGODB_URI in .env
- Ensure IP is whitelisted in MongoDB Atlas
- Verify username/password

**OCR not working**

- Ensure eng.traineddata file exists
- Check document image quality
- Verify Tesseract.js installation

**MetaMask issues**

- Ensure MetaMask is installed
- Switch to Sepolia testnet
- Check wallet has test ETH

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📞 Support

For issues and questions:

1. Check troubleshooting section
2. Review environment setup
3. Verify all services are configured
4. Check server logs for errors

---

**⚠️ Important**: This is a development/educational project. For production use, implement additional security measures, error handling, and testing.
