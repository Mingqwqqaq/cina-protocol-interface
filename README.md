# WRMB DApp

A modern, responsive decentralized application (DApp) for WRMB Finance, built with Vue 3, TypeScript, and Web3 technologies.

## Features

- 🔗 **Wallet Integration**: Connect with MetaMask, WalletConnect, and other popular wallets
- 💰 **Savings Module**: Deposit and withdraw tokens in the savings vault
- 🔄 **Wrap/Unwrap**: Convert between sRMB and sWRMB tokens
- 📊 **Bonds**: Subscribe to and manage bond investments
- 📈 **Portfolio**: Track your investments and performance
- 🌙 **Dark Mode**: Toggle between light and dark themes
- 🌍 **Multi-language**: Support for English and Chinese
- 📱 **Responsive**: Optimized for desktop and mobile devices
- ⚡ **Fast**: Built with Vite for lightning-fast development and builds

## Tech Stack

- **Frontend**: Vue 3, TypeScript, Vite
- **UI Framework**: Element Plus, Tailwind CSS
- **Web3**: ethers.js
- **State Management**: Pinia
- **Routing**: Vue Router
- **Internationalization**: Vue I18n
- **Build Tool**: Vite
- **Package Manager**: npm/yarn/pnpm

## Prerequisites

- Node.js 16+ 
- npm/yarn/pnpm
- A Web3 wallet (MetaMask recommended)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wrmb-user-dapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file and configure the following variables:
   ```env
   # Application Configuration
   VITE_APP_NAME=WRMB DApp
   VITE_DEFAULT_CHAIN_ID=1
   
   # Contract Addresses (replace with actual addresses)
   VITE_SAVINGS_VAULT_ADDRESS_ETHEREUM=0x...
   VITE_WRAP_MANAGER_ADDRESS_ETHEREUM=0x...
   VITE_BOND_POOL_ADDRESS_ETHEREUM=0x...
   VITE_WRMB_ADDRESS_ETHEREUM=0x...
   VITE_SWRMB_ADDRESS_ETHEREUM=0x...
   VITE_SRMB_ADDRESS_ETHEREUM=0x...
   
   # RPC Providers
   VITE_INFURA_PROJECT_ID=your_infura_project_id
   VITE_ALCHEMY_API_KEY=your_alchemy_api_key
   
   # WalletConnect
   VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
   ```

4. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Project Structure

```
src/
├── components/          # Reusable Vue components
│   ├── common/         # Common components (modals, buttons, etc.)
│   └── layout/         # Layout components (header, footer, etc.)
├── views/              # Page components
├── stores/             # Pinia stores for state management
├── router/             # Vue Router configuration
├── services/           # API and contract services
├── utils/              # Utility functions
├── constants/          # Application constants
├── locales/            # Internationalization files
├── i18n/               # i18n configuration
└── assets/             # Static assets
```

## Configuration

### Network Configuration

The app supports multiple networks. Configure them in `src/constants/index.ts`:

```typescript
export const NETWORKS = {
  ETHEREUM: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    blockExplorer: 'https://etherscan.io'
  },
  // Add more networks...
}
```

### Contract Addresses

Update contract addresses in your `.env` file or `src/constants/index.ts`:

```typescript
export const CONTRACTS = {
  SAVINGS_VAULT: {
    [NETWORKS.ETHEREUM.chainId]: process.env.VITE_SAVINGS_VAULT_ADDRESS_ETHEREUM
  },
  // Add more contracts...
}
```

### Wallet Configuration

Supported wallets are configured in `src/constants/index.ts`:

```typescript
export const SUPPORTED_WALLETS = {
  METAMASK: {
    name: 'MetaMask',
    connector: 'injected'
  },
  WALLET_CONNECT: {
    name: 'WalletConnect',
    connector: 'walletconnect'
  }
}
```

## Features Guide

### Wallet Connection

1. Click "Connect Wallet" in the header
2. Select your preferred wallet
3. Approve the connection in your wallet
4. Your wallet address and balance will be displayed

### Savings Module

1. Navigate to the Savings page
2. Enter the amount you want to deposit
3. Approve the token spending (if first time)
4. Confirm the deposit transaction
5. Your sWRMB balance will be updated

### Wrap/Unwrap

1. Go to the Wrap page
2. Choose between Wrap (sRMB → sWRMB) or Unwrap (sWRMB → sRMB)
3. Enter the amount
4. Confirm the transaction

### Bonds

1. Visit the Bonds page
2. Review available bond terms
3. Enter subscription amount
4. Confirm the bond subscription
5. Track your bonds in the "My Bonds" section

### Portfolio

1. Access the Portfolio page to view:
   - Total portfolio value
   - Asset allocation
   - Performance charts
   - Transaction history

## Troubleshooting

### Common Issues

1. **Wallet not connecting**
   - Ensure your wallet extension is installed and unlocked
   - Check if you're on the correct network
   - Try refreshing the page

2. **Transaction failing**
   - Check if you have sufficient balance
   - Ensure you've approved token spending
   - Verify gas settings

3. **Contract not found**
   - Verify contract addresses in `.env`
   - Ensure you're connected to the correct network

4. **Build errors**
   - Clear node_modules and reinstall dependencies
   - Check TypeScript errors with `npm run type-check`
   - Ensure all environment variables are set

### Development Tips

1. **Hot Reload**: The development server supports hot reload for fast development
2. **TypeScript**: Use TypeScript for better development experience
3. **ESLint**: Follow the configured linting rules
4. **Console Logs**: Check browser console for detailed error messages

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_APP_NAME` | Application name | No |
| `VITE_DEFAULT_CHAIN_ID` | Default blockchain network | Yes |
| `VITE_INFURA_PROJECT_ID` | Infura project ID for RPC | Yes |
| `VITE_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | Yes |
| `VITE_SAVINGS_VAULT_ADDRESS_*` | Savings vault contract address | Yes |
| `VITE_WRAP_MANAGER_ADDRESS_*` | Wrap manager contract address | Yes |
| `VITE_BOND_POOL_ADDRESS_*` | Bond pool contract address | Yes |
| `VITE_*_ADDRESS_*` | Token contract addresses | Yes |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Run tests and linting: `npm run lint && npm run type-check`
5. Commit your changes: `git commit -m 'Add new feature'`
6. Push to the branch: `git push origin feature/new-feature`
7. Submit a pull request

## Security

- Never commit private keys or sensitive information
- Always verify contract addresses before transactions
- Use hardware wallets for large amounts
- Keep your dependencies updated

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:

- 📧 Email: support@wrmb.finance
- 💬 Discord: [WRMB Community](https://discord.gg/wrmb)
- 🐦 Twitter: [@wrmb_finance](https://twitter.com/wrmb_finance)
- 📖 Documentation: [docs.wrmb.finance](https://docs.wrmb.finance)

## Changelog

### v1.0.0
- Initial release
- Wallet connection support
- Savings module
- Wrap/Unwrap functionality
- Bonds management
- Portfolio tracking
- Multi-language support
- Dark mode
- Responsive design