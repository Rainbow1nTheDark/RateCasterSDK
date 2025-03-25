import { ethers } from 'ethers';
import { RateCaster } from '../src';
import { CHAIN_CONFIGS } from '../src/constants';

// Ensure we have Amoy chain configuration
if (!CHAIN_CONFIGS[80002]) {
  console.error('Missing Polygon Amoy configuration in CHAIN_CONFIGS');
  process.exit(1);
}

// Mock transaction response
const mockTxResponse = {
  hash: '0xtxhash',
  wait: jest.fn().mockResolvedValue({ status: 1 }),
} as unknown as ethers.ContractTransactionResponse;

// Create mock functions for Amoy
const mockAddDappRating = jest.fn().mockResolvedValue(mockTxResponse);
const mockRegisterDapp = jest.fn().mockResolvedValue(mockTxResponse);
const mockUpdateDapp = jest.fn().mockResolvedValue(mockTxResponse);
const mockDeleteDapp = jest.fn().mockResolvedValue(mockTxResponse);

// Create mock Amoy contract
const mockAmoyContract = {
  target: CHAIN_CONFIGS[80002].contractAddress,
  interface: {
    getFunction: jest.fn().mockReturnValue(true),
    functions: {
      'dappRegistrationFee()': { name: 'dappRegistrationFee' },
      'dappRatingFee()': { name: 'dappRatingFee' }
    }
  },
  connect: jest.fn().mockReturnThis(),
  addDappRating: mockAddDappRating,
  revokeDappRating: jest.fn().mockResolvedValue(mockTxResponse),
  registerDapp: mockRegisterDapp,
  updateDapp: mockUpdateDapp,
  deleteDapp: mockDeleteDapp,
  getDapp: jest.fn().mockResolvedValue({
    dappId: "0xdappid",
    name: "Amoy Test Dapp",
    description: "Test Description on Amoy",
    url: "https://test-amoy.com",
    imageUrl: "https://test-amoy.com/image.png",
    category: "Testing",
    owner: "0xowner"
  }),
  getAllDapps: jest.fn().mockResolvedValue([
    {
      dappId: "0xdappid",
      name: "Amoy Test Dapp",
      description: "Test Description on Amoy",
      url: "https://test-amoy.com",
      imageUrl: "https://test-amoy.com/image.png",
      category: "Testing",
      owner: "0xowner"
    }
  ]),
  getDappRatingsCount: jest.fn().mockResolvedValue(3),
  isDappRegistered: jest.fn().mockResolvedValue(true),
  // Using properties instead of functions
  dappRatingFee: jest.fn().mockResolvedValue(ethers.parseEther("0.001")),
  dappRegistrationFee: jest.fn().mockResolvedValue(ethers.parseEther("0.01")),
} as unknown as ethers.Contract;

// Mock ethers Contract constructor
jest.mock('ethers', () => ({
  ...jest.requireActual('ethers'),
  Contract: jest.fn().mockImplementation((address) => {
    if (address === CHAIN_CONFIGS[80002].contractAddress) {
      return mockAmoyContract;
    }
    throw new Error(`Unexpected contract address: ${address}`);
  }),
}));

// Mock GraphQL response data
const mockReviewsData = {
  dappRatingSubmitteds: [
    {
      id: "0x123abc1",
      attestationId: "0xattestation1",
      dappId: "0xdappid",
      starRating: 5,
      reviewText: "Great app!",
      rater: "0xuser1"
    },
    {
      id: "0x123abc2",
      attestationId: "0xattestation2",
      dappId: "0xdappid",
      starRating: 4,
      reviewText: "Good features but could be better",
      rater: "0xuser2"
    },
    {
      id: "0x123abc3",
      attestationId: "0xattestation3",
      dappId: "0xdiffapp",
      starRating: 3,
      reviewText: "It's ok",
      rater: "0xuser1"
    }
  ]
};

// Mock the global fetch function
global.fetch = jest.fn().mockImplementation((url, options) => {
  const body = JSON.parse(options.body);
  const query = body.query;
  
  // Return different mock responses based on the query
  if (query.includes('dappRatingSubmitteds(where: { rater:')) {
    // User reviews query
    const userAddress = query.match(/rater: "([^"]+)"/)[1];
    const filteredReviews = mockReviewsData.dappRatingSubmitteds.filter(
      review => review.rater.toLowerCase() === userAddress
    );
    
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        data: {
          dappRatingSubmitteds: filteredReviews
        }
      })
    });
  } else {
    // All reviews or project-specific reviews query (we'll filter in the test)
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        data: mockReviewsData
      })
    });
  }
}) as jest.Mock;

describe('RateCaster SDK - Polygon Amoy Tests', () => {
  let sdk: RateCaster;
  let amoyProvider: ethers.JsonRpcProvider;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Mock Amoy provider
    amoyProvider = {
      getNetwork: jest.fn().mockResolvedValue({ 
        chainId: BigInt(80002), // Polygon Amoy
        name: 'amoy'
      }),
    } as unknown as ethers.JsonRpcProvider;

    // Initialize SDK with Amoy provider
    sdk = new RateCaster(amoyProvider);
    
    // Wait for initialization by making a call
    await sdk.getAllReviews();
  });

  it('should initialize SDK with Amoy network', async () => {
    // Check initialization by making a call
    const dapps = await sdk.getAllDapps();
    expect(dapps).toBeDefined();
  });

  it('should submit review on Polygon Amoy', async () => {
    const mockSigner = {
      provider: amoyProvider,
      getAddress: jest.fn().mockResolvedValue('0x1234...'),
    } as unknown as ethers.Signer;

    const response = await sdk.submitReview(
      '0xdappid',
      5,
      'Great dapp on Amoy!',
      mockSigner
    );

    expect(mockAddDappRating).toHaveBeenCalled();
    expect(response).toBe(mockTxResponse);
  });

  it('should register dapp on Polygon Amoy', async () => {
    const mockSigner = {
      provider: amoyProvider,
      getAddress: jest.fn().mockResolvedValue('0x1234...'),
    } as unknown as ethers.Signer;

    const response = await sdk.registerDapp(
      'Amoy Test Dapp',
      'Amoy Test Description',
      'https://amoy-test.com',
      'https://amoy-test.com/image.png',
      'Amoy Testing',
      mockSigner
    );

    expect(mockRegisterDapp).toHaveBeenCalled();
    expect(response).toBe(mockTxResponse);
  });

  it('should get dapp from Polygon Amoy', async () => {
    const dapp = await sdk.getDapp('0xdappid');
    expect(dapp).not.toBeNull();
    expect(dapp?.name).toBe('Amoy Test Dapp');
  });

  it('should get all dapps from Polygon Amoy', async () => {
    const dapps = await sdk.getAllDapps();
    expect(dapps).toHaveLength(1);
    expect(dapps[0].name).toBe('Amoy Test Dapp');
  });

  it('should check if dapp is registered on Amoy', async () => {
    const isRegistered = await sdk.isDappRegistered('0xdappid');
    expect(isRegistered).toBe(true);
  });

  it('should get fees information', async () => {
    // Access fee properties directly instead of calling getFees()
    const registrationFee = await mockAmoyContract.dappRegistrationFee();
    const ratingFee = await mockAmoyContract.dappRatingFee();
    
    expect(registrationFee.toString()).toBe(ethers.parseEther("0.01").toString());
    expect(ratingFee.toString()).toBe(ethers.parseEther("0.001").toString());
  });

  it('should update dapp on Polygon Amoy', async () => {
    const mockSigner = {
      provider: amoyProvider,
      getAddress: jest.fn().mockResolvedValue('0x1234...'),
    } as unknown as ethers.Signer;

    const response = await sdk.updateDapp(
      '0xdappid',
      'Updated Amoy Dapp',
      'Updated description',
      'https://updated-amoy.com',
      'https://updated-amoy.com/image.png',
      'Updated Category',
      mockSigner
    );

    expect(mockUpdateDapp).toHaveBeenCalled();
    expect(response).toBe(mockTxResponse);
  });

  it('should delete dapp on Polygon Amoy', async () => {
    const mockSigner = {
      provider: amoyProvider,
      getAddress: jest.fn().mockResolvedValue('0x1234...'),
    } as unknown as ethers.Signer;

    const response = await sdk.deleteDapp('0xdappid', mockSigner);

    expect(mockDeleteDapp).toHaveBeenCalled();
    expect(response).toBe(mockTxResponse);
  });

  // New tests for subgraph connection and reviews
  describe('Review Subgraph Integration', () => {
    it('should fetch all reviews from subgraph', async () => {
      const reviews = await sdk.getAllReviews();
      
      expect(fetch).toHaveBeenCalled();
      expect(reviews.length).toBe(3);
      expect(reviews[0].starRating).toBe(5);
      expect(reviews[1].reviewText).toBe('Good features but could be better');
    });

    it('should fetch project-specific reviews from subgraph', async () => {
      const projectId = '0xdappid';
      const reviews = await sdk.getProjectReviews(projectId);
      
      expect(fetch).toHaveBeenCalled();
      expect(reviews.length).toBe(2); // Only reviews for this project
      expect(reviews.every(review => review.dappId === projectId)).toBe(true);
    });

    it('should fetch user-specific reviews from subgraph', async () => {
      const userAddress = '0xuser1';
      const reviews = await sdk.getUserReviews(userAddress);
      
      expect(fetch).toHaveBeenCalled();
      expect(reviews.length).toBe(2); // Only reviews by this user
      expect(reviews.map(r => r.dappId)).toContain('0xdappid');
      expect(reviews.map(r => r.dappId)).toContain('0xdiffapp');
    });

    it('should calculate project stats from reviews', async () => {
      const projectId = '0xdappid';
      const stats = await sdk.getProjectStats(projectId);
      
      expect(fetch).toHaveBeenCalled();
      expect(stats.totalReviews).toBe(2);
      expect(stats.averageRating).toBe(4.5); // (5+4)/2
      expect(stats.ratingDistribution[5]).toBe(1);
      expect(stats.ratingDistribution[4]).toBe(1);
    });
  });
}); 