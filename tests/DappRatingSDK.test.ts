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
const mockRegisterDapp = jest.fn().mockResolvedValue(mockTxResponse);
const mockUpdateDapp = jest.fn().mockResolvedValue(mockTxResponse);
const mockDeleteDapp = jest.fn().mockResolvedValue(mockTxResponse);

// Mock provider
const mockProvider = {
  getNetwork: mockGetNetwork,
  send: jest.fn(),
} as unknown as ethers.Provider;

// Mock signer
const mockSigner = {
  provider: mockProvider,
  getAddress: jest.fn().mockResolvedValue('0x1234...'),
} as unknown as ethers.Signer;

// Mock contract with all methods
const createMockContract = (chainName: ChainName) => ({
  target: CHAIN_CONFIGS[chainName].contractAddress,
  interface: {
    getFunction: jest.fn().mockReturnValue(true),
  },
  connect: jest.fn().mockReturnThis(),
  addDappRating: mockAddDappRating,
  revokeDappRating: jest.fn().mockResolvedValue(mockTxResponse),
  registerDapp: mockRegisterDapp,
  updateDapp: mockUpdateDapp,
  deleteDapp: mockDeleteDapp,
  getAllDapps: jest.fn().mockResolvedValue([{
    dappId: '0xdappid',
    name: 'Test Dapp',
    description: 'Test Description',
    url: 'https://test.com',
    imageUrl: 'https://test.com/image.png',
    platform: chainName,
    category: 'DeFi',
    owner: '0x1234...'
  }]),
  getDapp: jest.fn().mockResolvedValue({
    dappId: '0xdappid',
    name: 'Test Dapp',
    description: 'Test Description',
    url: 'https://test.com',
    imageUrl: 'https://test.com/image.png',
    platform: chainName,
    category: 'DeFi',
    owner: '0x1234...'
  }),
  isDappRegistered: jest.fn().mockResolvedValue(true),
  on: jest.fn(),
  removeAllListeners: jest.fn(),
}) as unknown as ethers.Contract;

let mockContract: ethers.Contract;

// Mock ethers Contract constructor
jest.mock('ethers', () => ({
  ...jest.requireActual('ethers'),
  Contract: jest.fn().mockImplementation((_, __, provider) => {
    return mockContract;
  }),
}));

describe('DappRatingSDK', () => {
  let sdkPolygon: DappRatingSDK;
  let sdkBase: DappRatingSDK;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContract = createMockContract('Polygon');
    sdkPolygon = new DappRatingSDK(mockProvider, 'Polygon');
    mockContract = createMockContract('Base');
    sdkBase = new DappRatingSDK(mockProvider, 'Base');
  });

  describe('Initialization', () => {
    it('should initialize with Polygon configuration', () => {
      expect(sdkPolygon.getCurrentChain().name).toBe('Polygon');
      expect(sdkPolygon.getContractAddress()).toBe(process.env.POLYGON_CONTRACT_ADDRESS);
    });

    it('should initialize with Base configuration', () => {
      expect(sdkBase.getCurrentChain().name).toBe('Base');
      expect(sdkBase.getContractAddress()).toBe(process.env.BASE_CONTRACT_ADDRESS);
    });

    it('should throw error for unsupported chain', () => {
      expect(() => {
        new DappRatingSDK(mockProvider, 'InvalidChain' as ChainName);
      }).toThrow('Unsupported chain');
    });
  });

  describe('Chain Switching', () => {
    it('should switch from Polygon to Base', async () => {
      mockContract = createMockContract('Base');
      await sdkPolygon.switchChain('Base');
      expect(sdkPolygon.getCurrentChain().name).toBe('Base');
      expect(sdkPolygon.getContractAddress()).toBe(process.env.BASE_CONTRACT_ADDRESS);
    });

    it('should switch from Base to Polygon', async () => {
      mockContract = createMockContract('Polygon');
      await sdkBase.switchChain('Polygon');
      expect(sdkBase.getCurrentChain().name).toBe('Polygon');
      expect(sdkBase.getContractAddress()).toBe(process.env.POLYGON_CONTRACT_ADDRESS);
    });
  });

  describe('Review Management', () => {
    it('should submit review on Polygon', async () => {
      const response = await sdkPolygon.submitReview(
        '0xdappid',
        5,
        'Great dapp on Polygon!',
        mockSigner
      );
      expect(mockAddDappRating).toHaveBeenCalled();
      expect(response).toBe(mockTxResponse);
    });

    it('should submit review on Base', async () => {
      const response = await sdkBase.submitReview(
        '0xdappid',
        5,
        'Great dapp on Base!',
        mockSigner
      );
      expect(mockAddDappRating).toHaveBeenCalled();
      expect(response).toBe(mockTxResponse);
    });
  });

  describe('Dapp Management', () => {
    it('should register dapp on Polygon', async () => {
      const response = await sdkPolygon.registerDapp(
        'Polygon Dapp',
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

    it('should register dapp on Base', async () => {
      const response = await sdkBase.registerDapp(
        'Base Dapp',
        'Test Description',
        'https://test.com',
        'https://test.com/image.png',
        'Base',
        'DeFi',
        mockSigner
      );
      expect(mockRegisterDapp).toHaveBeenCalled();
      expect(response).toBe(mockTxResponse);
    });
  });

  describe('Chain Validation', () => {
    it('should validate Polygon chain ID', async () => {
      mockGetNetwork.mockResolvedValueOnce({ chainId: BigInt(137) });
      const isValid = await sdkPolygon.validateConnection();
      expect(isValid).toBe(true);
    });

    it('should validate Base chain ID', async () => {
      mockGetNetwork.mockResolvedValueOnce({ chainId: BigInt(8453) });
      const isValid = await sdkBase.validateConnection();
      expect(isValid).toBe(true);
    });
  });

  describe('Explorer URLs', () => {
    it('should return correct Polygon explorer URL', () => {
      expect(sdkPolygon.getExplorerUrl()).toBe(CHAIN_CONFIGS['Polygon'].explorer);
    });

    it('should return correct Base explorer URL', () => {
      expect(sdkBase.getExplorerUrl()).toBe(CHAIN_CONFIGS['Base'].explorer);
    });
  });

  describe('Static Chain Methods', () => {
    it('should get chain by Polygon ID', () => {
      expect(DappRatingSDK.getChainById(137)).toBe('Polygon');
    });

    it('should get chain by Base ID', () => {
      expect(DappRatingSDK.getChainById(8453)).toBe('Base');
    });

    it('should get all supported chains', () => {
      const chains = DappRatingSDK.getSupportedChains();
      expect(chains).toContain('Polygon');
      expect(chains).toContain('Base');
    });
  });
}); 