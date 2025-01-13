import { ethers } from 'ethers';
import { DappRatingSDK } from '../src';
import { CHAIN_CONFIGS } from '../src/constants';
import { ChainName } from '../src/types';

// Mock transaction response
const mockTxResponse = {
  hash: '0xtxhash',
  wait: jest.fn().mockResolvedValue({ status: 1 }),
} as unknown as ethers.ContractTransactionResponse;

// Create mock functions with proper Jest types
const mockGetNetwork = jest.fn().mockResolvedValue({ chainId: BigInt(137) });
const mockAddDappRating = jest.fn().mockResolvedValue(mockTxResponse);

// Mock provider
const mockProvider = {
  getNetwork: mockGetNetwork,
} as unknown as ethers.Provider;

// Mock signer
const mockSigner = {
  provider: mockProvider,
  getAddress: jest.fn().mockResolvedValue('0x1234...'),
} as unknown as ethers.Signer;

// Mock contract with all methods
const mockContract = {
  target: CHAIN_CONFIGS['Polygon'].contractAddress,
  interface: {
    getFunction: jest.fn().mockReturnValue(true),
  },
  connect: jest.fn().mockReturnThis(),
  // Review methods
  addDappRating: mockAddDappRating,
  revokeDappRating: jest.fn().mockResolvedValue(mockTxResponse),
  // Dapp management methods
  registerDapp: jest.fn().mockResolvedValue(mockTxResponse),
  updateDapp: jest.fn().mockResolvedValue(mockTxResponse),
  deleteDapp: jest.fn().mockResolvedValue(mockTxResponse),
  getAllDapps: jest.fn().mockResolvedValue([{
    dappId: '0xdappid',
    name: 'Test Dapp',
    description: 'Test Description',
    url: 'https://test.com',
    imageUrl: 'https://test.com/image.png',
    platform: 'Polygon',
    category: 'DeFi',
    owner: '0x1234...'
  }]),
  getDapp: jest.fn().mockResolvedValue({
    dappId: '0xdappid',
    name: 'Test Dapp',
    description: 'Test Description',
    url: 'https://test.com',
    imageUrl: 'https://test.com/image.png',
    platform: 'Polygon',
    category: 'DeFi',
    owner: '0x1234...'
  }),
  isDappRegistered: jest.fn().mockResolvedValue(true),
  // Event methods
  on: jest.fn(),
  removeAllListeners: jest.fn(),
} as unknown as ethers.Contract;

// Mock ethers Contract constructor
jest.mock('ethers', () => ({
  ...jest.requireActual('ethers'),
  Contract: jest.fn().mockImplementation(() => mockContract),
}));

describe('DappRatingSDK', () => {
  let sdk: DappRatingSDK;

  beforeEach(() => {
    jest.clearAllMocks();
    sdk = new DappRatingSDK(mockProvider, 'Polygon');
  });

  describe('Initialization', () => {
    it('should initialize with Polygon configuration', () => {
      expect(sdk.getCurrentChain().name).toBe('Polygon');
      expect(sdk.getContractAddress()).toBe(process.env.POLYGON_CONTRACT_ADDRESS);
    });

    it('should throw error for unsupported chain', () => {
      expect(() => {
        new DappRatingSDK(mockProvider, 'InvalidChain' as ChainName);
      }).toThrow('Unsupported chain');
    });
  });

  describe('Review Management', () => {
    it('should submit a review', async () => {
      const response = await sdk.submitReview(
        '0xdappid',
        5,
        'Great dapp!',
        mockSigner
      );
      expect(mockContract.addDappRating).toHaveBeenCalledWith(
        expect.any(String), // dappId in bytes32
        5,
        'Great dapp!'
      );
      expect(response).toBe(mockTxResponse);
    });

    it('should reject invalid star ratings', async () => {
      await expect(
        sdk.submitReview('0xdappid', 6, 'Invalid rating', mockSigner)
      ).rejects.toThrow('Star rating must be between 1 and 5');
    });

    it('should revoke a review', async () => {
      const response = await sdk.revokeReview('0xreviewid', mockSigner);
      expect(mockContract.revokeDappRating).toHaveBeenCalledWith('0xreviewid');
      expect(response).toBe(mockTxResponse);
    });
  });

  describe('Dapp Management', () => {
    it('should register a new dapp', async () => {
      const response = await sdk.registerDapp(
        'Test Dapp',
        'Test Description',
        'https://test.com',
        'https://test.com/image.png',
        'Polygon',
        'DeFi',
        mockSigner
      );
      expect(mockContract.registerDapp).toHaveBeenCalledWith(
        'Test Dapp',
        'Test Description',
        'https://test.com',
        'https://test.com/image.png',
        'Polygon',
        'DeFi'
      );
      expect(response).toBe(mockTxResponse);
    });

    it('should update an existing dapp', async () => {
      const response = await sdk.updateDapp(
        '0xdappid',
        'Updated Dapp',
        'Updated Description',
        'https://updated.com',
        'https://updated.com/image.png',
        'Polygon',
        'GameFi',
        mockSigner
      );
      expect(mockContract.updateDapp).toHaveBeenCalledWith(
        expect.any(String), // dappId in bytes32
        'Updated Dapp',
        'Updated Description',
        'https://updated.com',
        'https://updated.com/image.png',
        'Polygon',
        'GameFi'
      );
      expect(response).toBe(mockTxResponse);
    });

    it('should delete a dapp', async () => {
      const response = await sdk.deleteDapp('0xdappid', mockSigner);
      expect(mockContract.deleteDapp).toHaveBeenCalledWith(
        expect.any(String) // dappId in bytes32
      );
      expect(response).toBe(mockTxResponse);
    });

    it('should get all dapps', async () => {
      const dapps = await sdk.getAllDapps();
      expect(mockContract.getAllDapps).toHaveBeenCalled();
      expect(Array.isArray(dapps)).toBe(true);
      expect(dapps[0]).toHaveProperty('name', 'Test Dapp');
    });

    it('should get a single dapp', async () => {
      const dapp = await sdk.getDapp('0xdappid');
      expect(mockContract.getDapp).toHaveBeenCalledWith(expect.any(String));
      expect(dapp).toHaveProperty('name', 'Test Dapp');
    });

    it('should check if dapp is registered', async () => {
      const isRegistered = await sdk.isDappRegistered('0xdappid');
      expect(mockContract.isDappRegistered).toHaveBeenCalledWith(expect.any(String));
      expect(isRegistered).toBe(true);
    });
  });

  describe('Event Handling', () => {
    it('should listen to review events', async () => {
      const callback = jest.fn();
      await sdk.listenToReviews(callback);
      expect(mockContract.on).toHaveBeenCalledWith(
        'DappRatingSubmitted',
        expect.any(Function)
      );
    });

    it('should stop listening to events', async () => {
      await sdk.stopListening();
      expect(mockContract.removeAllListeners).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle contract call failures', async () => {
      mockAddDappRating.mockRejectedValueOnce(new Error('Contract call failed'));
      await expect(
        sdk.submitReview('0xdappid', 5, 'Test review', mockSigner)
      ).rejects.toThrow('Failed to submit review');
    });

    it('should handle network validation errors', async () => {
      mockGetNetwork.mockRejectedValueOnce(new Error('Network error'));
      const isValid = await sdk.validateConnection();
      expect(isValid).toBe(false);
    });
  });
}); 