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

// Create mock contracts for different chains
const mockPolygonContract = {
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
  getDapp: jest.fn().mockResolvedValue({
    dappId: "0xdappid",
    name: "Test Dapp",
    description: "Test Description",
    url: "https://test.com",
    imageUrl: "https://test.com/image.png",
    category: "Testing",
    owner: "0xowner"
  }),
  getAllDapps: jest.fn().mockResolvedValue([
    {
      dappId: "0xdappid",
      name: "Test Dapp",
      description: "Test Description",
      url: "https://test.com",
      imageUrl: "https://test.com/image.png",
      category: "Testing",
      owner: "0xowner"
    }
  ]),
  getDappRatingsCount: jest.fn().mockResolvedValue(5),
  isDappRegistered: jest.fn().mockResolvedValue(true),
  dappRatingFee: jest.fn().mockResolvedValue(ethers.parseEther("0")),
  dappRegistrationFee: jest.fn().mockResolvedValue(ethers.parseEther("0")),
} as unknown as ethers.Contract;

// Create identical mock contract for Amoy
const mockAmoyContract = {
  // Reference Amoy address instead
  target: CHAIN_CONFIGS[80002]?.contractAddress || "0xAmoyAddress",
  interface: {
    getFunction: jest.fn().mockReturnValue(true),
  },
  connect: jest.fn().mockReturnThis(),
  addDappRating: mockAddDappRating,
  revokeDappRating: jest.fn().mockResolvedValue(mockTxResponse),
  registerDapp: mockRegisterDapp,
  updateDapp: mockUpdateDapp,
  deleteDapp: mockDeleteDapp,
  getDapp: jest.fn().mockResolvedValue({
    dappId: "0xdappid",
    name: "Test Dapp",
    description: "Test Description",
    url: "https://test.com",
    imageUrl: "https://test.com/image.png",
    category: "Testing",
    owner: "0xowner"
  }),
  getAllDapps: jest.fn().mockResolvedValue([
    {
      dappId: "0xdappid",
      name: "Test Dapp",
      description: "Test Description",
      url: "https://test.com",
      imageUrl: "https://test.com/image.png",
      category: "Testing",
      owner: "0xowner"
    }
  ]),
  getDappRatingsCount: jest.fn().mockResolvedValue(5),
  isDappRegistered: jest.fn().mockResolvedValue(true),
  dappRatingFee: jest.fn().mockResolvedValue(ethers.parseEther("0")),
  dappRegistrationFee: jest.fn().mockResolvedValue(ethers.parseEther("0")),
} as unknown as ethers.Contract;

// Mock ethers Contract constructor to return different contracts based on address
jest.mock('ethers', () => ({
  ...jest.requireActual('ethers'),
  Contract: jest.fn().mockImplementation((address) => {
    if (address === CHAIN_CONFIGS[137].contractAddress) {
      return mockPolygonContract;
    } else if (address === CHAIN_CONFIGS[80002]?.contractAddress || address === "0xAmoyAddress") {
      return mockAmoyContract;
    }
    // Default case
    return mockPolygonContract;
  }),
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

  describe('Polygon Mainnet Tests', () => {
    let validProvider: ethers.JsonRpcProvider;

    beforeEach(async () => {
      validProvider = {
        getNetwork: jest.fn().mockResolvedValue({ 
          chainId: BigInt(137) // Polygon Mainnet
        }),
      } as unknown as ethers.JsonRpcProvider;

      sdk = new RateCaster(validProvider);
      // Wait for initialization by making a call
      await sdk.getAllReviews();
    });

    it('should submit review on Polygon Mainnet', async () => {
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

    it('should register dapp on Polygon Mainnet', async () => {
      const mockSigner = {
        provider: validProvider,
        getAddress: jest.fn().mockResolvedValue('0x1234...'),
      } as unknown as ethers.Signer;

      const response = await sdk.registerDapp(
        'Test Dapp',
        'Test Description',
        'https://test.com',
        'https://test.com/image.png',
        'Testing',
        mockSigner
      );

      expect(mockRegisterDapp).toHaveBeenCalled();
      expect(response).toBe(mockTxResponse);
    });

    it('should get dapp from Polygon Mainnet', async () => {
      const dapp = await sdk.getDapp('0xdappid');
      expect(dapp).not.toBeNull();
      expect(dapp?.name).toBe('Test Dapp');
    });

    it('should get all dapps from Polygon Mainnet', async () => {
      const dapps = await sdk.getAllDapps();
      expect(dapps).toHaveLength(1);
      expect(dapps[0].name).toBe('Test Dapp');
    });
  });

  // New test suite for Polygon Amoy
  describe('Polygon Amoy Tests', () => {
    let amoyProvider: ethers.JsonRpcProvider;

    beforeEach(async () => {
      amoyProvider = {
        getNetwork: jest.fn().mockResolvedValue({ 
          chainId: BigInt(80002) // Polygon Amoy
        }),
      } as unknown as ethers.JsonRpcProvider;

      sdk = new RateCaster(amoyProvider);
      // Wait for initialization by making a call
      await sdk.getAllReviews();
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
      expect(dapp?.name).toBe('Test Dapp');
    });

    it('should get all dapps from Polygon Amoy', async () => {
      const dapps = await sdk.getAllDapps();
      expect(dapps).toHaveLength(1);
      expect(dapps[0].name).toBe('Test Dapp');
    });

    it('should check if dapp is registered on Amoy', async () => {
      const isRegistered = await sdk.isDappRegistered('0xdappid');
      expect(isRegistered).toBe(true);
    });

    it('should get fees from Amoy contract', async () => {
      const fees = await sdk.getFees();
      expect(fees.registrationFee.toString()).toBe('0');
      expect(fees.ratingFee.toString()).toBe('0');
    });
  });

  // Add test for switching networks
  describe('Network Switching', () => {
    it('should switch from Polygon to Amoy and back', async () => {
      // Start with Polygon
      const polygonProvider = {
        getNetwork: jest.fn().mockResolvedValue({ 
          chainId: BigInt(137)
        }),
      } as unknown as ethers.JsonRpcProvider;
      
      sdk = new RateCaster(polygonProvider);
      await sdk.getAllReviews();
      
      // Get a dapp on Polygon
      const polygonDapp = await sdk.getDapp('0xdappid');
      expect(polygonDapp).not.toBeNull();
      
      // Switch to Amoy
      const amoyProvider = {
        getNetwork: jest.fn().mockResolvedValue({ 
          chainId: BigInt(80002)
        }),
      } as unknown as ethers.JsonRpcProvider;
      
      sdk.updateProvider(amoyProvider);
      await sdk.isInitialized();
      
      // Get a dapp on Amoy
      const amoyDapp = await sdk.getDapp('0xdappid');
      expect(amoyDapp).not.toBeNull();
      
      // Switch back to Polygon
      sdk.updateProvider(polygonProvider);
      await sdk.isInitialized();
      
      // Verify we're back on Polygon
      const backToPolygon = await sdk.getDapp('0xdappid');
      expect(backToPolygon).not.toBeNull();
    });
  });
}); 