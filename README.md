# RateCaster SDK

SDK for interacting with RateCaster smart contracts on Polygon and Base networks.

## Installation

npm install @alexanders-team/ratecaster-sdk

## Usage

import { DappRatingSDK } from '@alexanders-team/ratecaster-sdk';
import { ethers } from 'ethers';

// Initialize with browser wallet (MetaMask)
const provider = new ethers.BrowserProvider(window.ethereum);
const sdk = new DappRatingSDK(provider, 'Polygon'); // or 'Base'

// Submit a review
const submitReview = async () => {
    const signer = await provider.getSigner();
    const tx = await sdk.submitReview(
        'dapp-id',
        5, // rating (1-5)
        'Great dapp!',
        signer
    );
    await tx.wait();
};

// Register a new dapp
const registerDapp = async () => {
    const signer = await provider.getSigner();
    const tx = await sdk.registerDapp(
        'My Dapp',
        'Description of my dapp',
        'https://mydapp.com',
        'https://mydapp.com/image.png',
        'Polygon', // or 'Base'
        'DeFi',    // category
        signer
    );
    await tx.wait();
};

// Get all dapps
const getAllDapps = async () => {
    const dapps = await sdk.getAllDapps();
    console.log('Dapps:', dapps);
};

// Switch networks
const switchToBase = async () => {
    await sdk.switchChain('Base');
    console.log('Current chain:', sdk.getCurrentChain());
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

## API Reference

### Constructor
new DappRatingSDK(provider: ethers.Provider, chainName: 'Polygon' | 'Base')

### Review Methods
- submitReview(dappId: string, starRating: number, reviewText: string, signer: ethers.Signer): Promise<TransactionResponse>
- revokeReview(ratingUid: string, signer: ethers.Signer): Promise<TransactionResponse>

### Dapp Management
- registerDapp(name: string, description: string, url: string, imageURL: string, platform: string, category: string, signer: ethers.Signer): Promise<TransactionResponse>
- updateDapp(dappId: string, name: string, description: string, url: string, imageURL: string, platform: string, category: string, signer: ethers.Signer): Promise<TransactionResponse>
- deleteDapp(dappId: string, signer: ethers.Signer): Promise<TransactionResponse>
- getAllDapps(): Promise<Dapp[]>
- getDapp(dappId: string): Promise<Dapp>
- isDappRegistered(dappId: string): Promise<boolean>

### Chain Management
- switchChain(chainName: 'Polygon' | 'Base'): Promise<void>
- getCurrentChain(): ChainInfo
- validateConnection(): Promise<boolean>
- getContractAddress(): string
- getExplorerUrl(): string

### Event Handling
- listenToReviews(callback: (review: DappReview) => void): void
- stopListening(): void

### Static Methods
- getSupportedChains(): ChainName[]
- getChainById(chainId: number): ChainName | undefined

## Supported Networks
- Polygon (chainId: 137)
- Base (chainId: 8453)

## Requirements
- ethers.js v6.0.0 or higher
- A Web3 provider (e.g., MetaMask)

## License
MIT