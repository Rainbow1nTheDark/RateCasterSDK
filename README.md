# RateCaster SDK
A powerful toolkit for integrating decentralized, transparent dApp ratings and reviews directly into your blockchain applications.

## What is RateCaster?

RateCaster is a decentralized rating and review system designed to bring transparency and trust to blockchain ecosystems. Our platform has processed over 24,000 transactions from 800+ active accounts, establishing itself as a trusted feedback mechanism for decentralized applications.

This SDK provides developers with all the tools needed to:
- Register and manage dApp listings
- Enable users to submit verified ratings and reviews
- Display aggregated community feedback
- Access powerful analytics on user sentiment

## Supported Networks
- Polygon Mainnet (chainId: 137)
- Polygon Amoy Testnet (chainId: 80002)

## Installation
```npm install ratecaster```

## Usage
```
import { RateCaster } from '@alexanders-team/ratecaster-sdk';
import { ethers } from 'ethers';

// Initialize with provider
const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
// For browser wallets: const provider = new ethers.BrowserProvider(window.ethereum);

// Create SDK instance
const sdk = new RateCaster(provider);

// Submit a review
const submitReview = async () => {
  const signer = await provider.getSigner();
  const tx = await sdk.submitReview(
    'dapp-id', // Can be URL or bytes32 hash
    5, // Rating (1-5 stars)
    'Great dapp!',
    signer
  );
  await tx.wait();
  console.log('Review submitted!');
};

// Register a new dapp
const registerDapp = async () => {
  const signer = await provider.getSigner();
  const tx = await sdk.registerDapp(
    'My Dapp',
    'Description of my dapp',
    'https://mydapp.com',
    'https://mydapp.com/image.png',
    'DeFi', // Category
    signer
  );
  await tx.wait();
  console.log('Dapp registered!');
};

// Get all dapps with their ratings
const getAllDapps = async () => {
  const dapps = await sdk.getAllDapps(true); // true to include ratings
  console.log('Dapps:', dapps);
};

// Get reviews for a specific app
const getAppReviews = async (dappId) => {
  const reviews = await sdk.getProjectReviews(dappId);
  console.log(`Found ${reviews.length} reviews for dapp ${dappId}`);
  // Get project statistics
  const stats = await sdk.getProjectStats(dappId);
  console.log(`Average rating: ${stats.averageRating}`);
  console.log(`Total reviews: ${stats.totalReviews}`);
};

// Get reviews by a specific user
const getUserReviews = async (userAddress) => {
  const reviews = await sdk.getUserReviews(userAddress);
  console.log(`User ${userAddress} has written ${reviews.length} reviews`);
};

// Listen to new reviews
const listenToReviews = () => {
  sdk.listenToReviews((review) => {
    console.log('New review:', review);
  });
};

// Stop listening to reviews
const stopListening = () => {
  sdk.stopListening();
};
```
## API Reference

### Constructor
```new RateCaster(provider: ethers.JsonRpcProvider)```

### Review Methods
```
submitReview(dappId: string, starRating: number, reviewText: string, signer: ethers.Signer): Promise<ethers.ContractTransactionResponse>
revokeReview(ratingUid: string, signer: ethers.Signer): Promise<ethers.ContractTransactionResponse>
getProjectReviews(projectId: string): Promise<DappRating[]>
getUserReviews(userAddress: string): Promise<DappRating[]>
getProjectStats(projectId: string): Promise<{ totalReviews: number, averageRating: number, ratingDistribution: Record<number, number> }>
getAllReviews(): Promise<DappRating[]>
```
### Dapp Management
```
registerDapp(name: string, description: string, url: string, imageURL: string, category: string, signer: ethers.Signer): Promise<ethers.ContractTransactionResponse>
updateDapp(dappId: string, name: string, description: string, url: string, imageURL: string, category: string, signer: ethers.Signer): Promise<ethers.ContractTransactionResponse>
deleteDapp(dappId: string, signer: ethers.Signer): Promise<ethers.ContractTransactionResponse>
getAllDapps(includeRatings?: boolean): Promise<DappRegistered[]>
getDapp(dappId: string, includeRatings?: boolean): Promise<DappRegistered | null>
isDappRegistered(dappId: string): Promise<boolean>
```
### Contract Interaction
```
hasUserRatedProject(userAddress: string, projectId: string): Promise<boolean>
getUserRatingCount(userAddress: string): Promise<number>
getProjectRatingCount(projectId: string): Promise<number>
```
### Chain Management
```
getCurrentChain(): ChainInfo
validateConnection(): Promise<boolean>
getContractAddress(): string
getExplorerUrl(): string
```

### Logging Control
```
setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void
getLogLevel(): string
```

## Requirements
- ethers.js v6.0.0 or higher

## Types
```typescript
interface DappRegistered {
  dappId: string;
  name: string;
  description: string;
  url: string;
  imageUrl: string;
  categoryId: number;  // Numeric category ID
  category: string;    // Human-readable category name (automatically populated)
  owner: string;
  averageRating?: number;
  totalReviews?: number;
}

interface DappRating {
  id: string;
  attestationId: string;
  dappId: string;
  starRating: number;
  reviewText: string;
  rater?: string;
}
```

## Category System

RateCaster uses a hierarchical category system with main categories and subcategories. Each category has a unique numeric ID.

### Helper Functions

```typescript
// Get all available categories with their groups
const categories = sdk.getCategoryOptions();
// Returns: Array<{value: number, label: string, group: string}>
// Example: [{value: 401, label: "Betting", group: "DeFi"}, ...]

// Get subcategories for a specific main category
const defiCategories = sdk.getCategoriesByMainCategory(400);
// Returns all DeFi subcategories

// Get category name from ID
const categoryName = sdk.getCategoryName(401);
// Returns: "Betting"

// Get main category name from any category ID
const mainCategory = sdk.getMainCategoryName(401);
// Returns: "DeFi"
```

### Main Categories
- B2B (100-199)
- Tools (200-299)
- DApps (300-399)
- DeFi (400-499)
- Social (500-599)
- NFT (600-699)
- Gaming (700-799)

### Using Categories

When registering or updating a dapp, use the numeric category ID:

```typescript
await sdk.registerDapp(
  "My DeFi App",
  "Description",
  "https://myapp.com",
  "https://myapp.com/image.png",
  401, // Use numeric category ID for Betting
  signer
);
```

When retrieving dapps, the SDK automatically converts category IDs to human-readable names:

```typescript
const dapps = await sdk.getAllDapps();
// Returns:
{
  name: "My DeFi App",
  categoryId: 401,         // Original numeric ID
  category: "Betting",     // Automatically resolved name
  // ... other properties
}
```

### Category Reference

#### B2B (100-199)
- 100: B2B
- 101: Decentralised Storage
- 102: Decentralised Compute
- 103: Automation/Bots
- 104: On Ramp/Off Ramp
- 105: Dev Tools
- 106: Explorer
- 107: Wallet
- 108: Infrastructure
- 199: Others

#### DeFi (400-499)
- 400: DeFi
- 401: Betting
- 402: Lending
- 403: Prediction Market
- 404: Stablecoin
- 405: Yield Aggregator
- 406: Synthetics
- 407: Insurance
- 408: Reserve Currency
- 409: Oracle
- 410: Lottery
- 411: Staking
- 412: DEX
- 413: Bridge
- 414: Yield
- 415: Launchpad
- 416: Tooling
- 417: Derivatives
- 418: Payments
- 419: Indexes
- 420: Privacy