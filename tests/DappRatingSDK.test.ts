import { ethers } from 'ethers';
import { RateCaster } from '../src';
import { CHAIN_CONFIGS } from '../src/constants';

// Mock transaction response
const mockTxResponse = {
  hash: '0xtxhash',
  wait: jest.fn().mockResolvedValue({ status: 1 }),
} as unknown as ethers.ContractTransactionResponse;

// Create mock functions
const mockAddDappRating = jest.fn().mockResolvedValue(mockTxResponse);
const mockRegisterDapp = jest.fn().mockResolvedValue(mockTxResponse);
const mockUpdateDapp = jest.fn().mockResolvedValue(mockTxResponse);
const mockDeleteDapp = jest.fn().mockResolvedValue(mockTxResponse);

// Create mock contract
const mockContract = {
  target: CHAIN_CONFIGS[137].contractAddress,
  interface: {
    getFunction: jest.fn().mockReturnValue(true),
  },
  connect: jest.fn().mockReturnThis(),
  addDappRating: mockAddDappRating,
  revokeDappRating: jest.fn().mockResolvedValue(mockTxResponse),
  registerDapp: mockRegisterDapp,
  updateDapp: mockUpdateDapp,
  deleteDapp: mockDeleteDapp,
} as unknown as ethers.Contract;

// Mock ethers Contract constructor
jest.mock('ethers', () => ({
  ...jest.requireActual('ethers'),
  Contract: jest.fn().mockImplementation(() => mockContract),
}));

describe('RateCaster SDK', () => {
  let sdk: RateCaster;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should throw error for null provider', () => {
      expect(() => 
        new RateCaster(null as any)
      ).toThrow('Provider is not initialized');
    });

    it('should throw error when provider returns invalid network', async () => {
      const invalidProvider = {
        getNetwork: jest.fn().mockResolvedValue(null),
      } as unknown as ethers.JsonRpcProvider;

      const sdk = new RateCaster(invalidProvider);
      await expect(sdk.getAllReviews())
        .rejects
        .toThrow('Failed to get network from provider');
    });

    it('should throw error for unsupported chain', async () => {
      const wrongChainProvider = {
        getNetwork: jest.fn().mockResolvedValue({ 
          chainId: BigInt(1) // Ethereum mainnet
        }),
      } as unknown as ethers.JsonRpcProvider;

      const sdk = new RateCaster(wrongChainProvider);
      await expect(sdk.getAllReviews())
        .rejects
        .toThrow('Configuration not found for chain: 1');
    });

    it('should initialize successfully with valid Polygon provider', async () => {
      const validProvider = {
        getNetwork: jest.fn().mockResolvedValue({ 
          chainId: BigInt(137) // Polygon
        }),
      } as unknown as ethers.JsonRpcProvider;

      const sdk = new RateCaster(validProvider);
      await expect(sdk.getAllReviews()).resolves.not.toThrow();
    });
  });

  describe('Review Management', () => {
    let validProvider: ethers.JsonRpcProvider;

    beforeEach(async () => {
      validProvider = {
        getNetwork: jest.fn().mockResolvedValue({ 
          chainId: BigInt(137)
        }),
      } as unknown as ethers.JsonRpcProvider;

      sdk = new RateCaster(validProvider);
      // Wait for initialization by making a call
      await sdk.getAllReviews();
    });

    it('should submit review', async () => {
      const mockSigner = {
        provider: validProvider,
        getAddress: jest.fn().mockResolvedValue('0x1234...'),
      } as unknown as ethers.Signer;

      const response = await sdk.submitReview(
        '0xdappid',
        5,
        'Great dapp!',
        mockSigner
      );

      expect(mockAddDappRating).toHaveBeenCalled();
      expect(response).toBe(mockTxResponse);
    });
  });

  describe('Dapp Management', () => {
    let validProvider: ethers.JsonRpcProvider;

    beforeEach(async () => {
      validProvider = {
        getNetwork: jest.fn().mockResolvedValue({ 
          chainId: BigInt(137)
        }),
      } as unknown as ethers.JsonRpcProvider;

      sdk = new RateCaster(validProvider);
      // Wait for initialization by making a call
      await sdk.getAllReviews();
    });

    it('should register dapp', async () => {
      const mockSigner = {
        provider: validProvider,
        getAddress: jest.fn().mockResolvedValue('0x1234...'),
      } as unknown as ethers.Signer;

      const response = await sdk.registerDapp(
        'Test Dapp',
        'Test Description',
        'https://test.com',
        'https://test.com/image.png',
        'Polygon',
        'DeFi',
        mockSigner
      );

      expect(mockRegisterDapp).toHaveBeenCalled();
      expect(response).toBe(mockTxResponse);
    });
  });
}); 