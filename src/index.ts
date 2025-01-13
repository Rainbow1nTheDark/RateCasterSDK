import { ethers, Contract, ContractTransaction } from 'ethers';
import { 
  ChainName, 
  ChainInfo, 
  SDKConfig,
  DappReview 
} from './types';
import { CHAIN_CONFIGS, CONTRACT_ABI } from './constants';
import * as queries from './graphql/queries';

export class DappRatingSDK {
  private provider: ethers.Provider;
  private chainName: ChainName;
  private contract: Contract;
  private chainConfig: ChainInfo;

  constructor(
    provider: ethers.Provider,
    chainName: ChainName
  ) {
    this.provider = provider;
    this.chainName = chainName;
    
    // Get chain configuration from constants
    this.chainConfig = CHAIN_CONFIGS[chainName];
    if (!this.chainConfig) {
      throw new Error(`Unsupported chain: ${chainName}`);
    }

    // Initialize contract with the chain's contract address
    this.contract = new Contract(
      this.chainConfig.contractAddress,
      CONTRACT_ABI,
      this.provider
    );

    // Verify contract initialization
    if (!this.contract.interface.getFunction('addDappRating')) {
      throw new Error('Contract initialization failed: addDappRating function not found');
    }
  }

  private getGraphqlUrl(): string {
    return this.chainConfig.graphqlUrl
      ?? this.chainConfig.graphqlUrl;
  }

  private async queryGraph(query: string, variables: any = {}) {
    const response = await fetch(this.getGraphqlUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`GraphQL Error: ${response.statusText}`);
    }

    const json = await response.json();
    if (json.errors) {
      throw new Error(`GraphQL Error: ${json.errors[0].message}`);
    }

    return json.data;
  }

  // Public methods for reviews
  public async submitReview(
    dappId: string,
    starRating: number,
    reviewText: string,
    signer: ethers.Signer
  ): Promise<ContractTransaction> {
    if (starRating < 1 || starRating > 5) {
      throw new Error('Star rating must be between 1 and 5');
    }

    try {
      // Connect the contract with the signer
      const signedContract = this.contract.connect(signer) as Contract;

      // Convert dappId to bytes32
      const dappIdBytes32 = ethers.isHexString(dappId) && dappId.length === 66
        ? dappId
        : ethers.keccak256(ethers.toUtf8Bytes(dappId));

      // Call the contract method
      const tx = await signedContract.addDappRating(
        dappIdBytes32,
        starRating,
        reviewText
      );

      return tx;
    } catch (error: any) {
      console.error('Contract address:', this.contract.target);
      console.error('Error details:', error);
      throw new Error(`Failed to submit review: ${error.message || error}`);
    }
  }

  public async revokeReview(
    ratingUid: string,
    signer: ethers.Signer
  ): Promise<ContractTransaction> {
    const signedContract = this.contract.connect(signer) as Contract;
    return signedContract.revokeDappRating(ratingUid);
  }

  public async getProjectReviews(projectId: string): Promise<DappReview[]> {
    const data = await this.queryGraph(queries.GET_PROJECT_REVIEWS, { projectId });
    return data.reviewSubmitteds;
  }

  public async getUserReviews(userAddress: string): Promise<DappReview[]> {
    const data = await this.queryGraph(queries.GET_USER_REVIEWS, { userAddress });
    return data.reviewSubmitteds;
  }

  public async getProjectStats(projectId: string) {
    const reviews = await this.getProjectReviews(projectId);
    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((acc, review) => acc + review.starRating, 0) / totalReviews;
    
    return {
      totalReviews,
      averageRating: averageRating || 0,
      ratingDistribution: {
        1: reviews.filter(r => r.starRating === 1).length,
        2: reviews.filter(r => r.starRating === 2).length,
        3: reviews.filter(r => r.starRating === 3).length,
        4: reviews.filter(r => r.starRating === 4).length,
        5: reviews.filter(r => r.starRating === 5).length,
      }
    };
  }

  // Contract state reading methods
  public async hasUserRatedProject(userAddress: string, projectId: string): Promise<boolean> {
    const projectIdBytes32 = ethers.isHexString(projectId) && projectId.length === 66
      ? projectId
      : ethers.keccak256(ethers.toUtf8Bytes(projectId));
    return this.contract.raterToProjectToRated(userAddress, projectIdBytes32);
  }

  public async getUserRatingCount(userAddress: string): Promise<number> {
    const count = await this.contract.raterToNumberOfRates(userAddress);
    return Number(count);
  }

  public async getProjectRatingCount(projectId: string): Promise<number> {
    const projectIdBytes32 = ethers.isHexString(projectId) && projectId.length === 66
      ? projectId
      : ethers.keccak256(ethers.toUtf8Bytes(projectId));
    const count = await this.contract.projectToNumberOfRates(projectIdBytes32);
    return Number(count);
  }

  // Chain management methods
  public async switchChain(chainName: ChainName) {
    const newConfig = CHAIN_CONFIGS[chainName];
    if (!newConfig) {
      throw new Error(`Unsupported chain: ${chainName}`);
    }
    
    if (this.provider instanceof ethers.BrowserProvider) {
      await this.provider.send('wallet_switchEthereumChain', [
        { chainId: `0x${newConfig.chainId.toString(16)}` }
      ]);
    }

    this.chainName = chainName;
    this.chainConfig = newConfig;
    
    // Reinitialize contract with new chain's address
    this.contract = new Contract(
      this.chainConfig.contractAddress,
      CONTRACT_ABI,
      this.provider
    );
  }

  public getCurrentChain(): ChainInfo {
    return this.chainConfig;
  }

  // Static methods for chain information
  public static getSupportedChains(): ChainName[] {
    return Object.keys(CHAIN_CONFIGS) as ChainName[];
  }

  public static getChainById(chainId: number): ChainName | undefined {
    const entry = Object.entries(CHAIN_CONFIGS).find(
      ([_, config]) => config.chainId === chainId
    );
    return entry ? (entry[0] as ChainName) : undefined;
  }

  // Utility methods
  public async validateConnection(): Promise<boolean> {
    try {
      const network = await this.provider.getNetwork();
      const expectedChainId = this.chainConfig.chainId;
      return network.chainId === BigInt(expectedChainId);
    } catch (error) {
      return false;
    }
  }

  public getContractAddress(): string {
    return this.contract.target as string;
  }

  public getExplorerUrl(): string {
    return this.chainConfig.explorer;
  }

  public async listenToReviews(
    callback: (review: DappReview) => void
  ): Promise<Contract> {
    this.contract.on("DappRatingSubmitted", 
      (
        attestationId: string,
        dappId: string,
        starRating: number,
        reviewText: string,
        event: ethers.EventLog
      ) => {
        callback({
          attestationId,
          dappId: typeof dappId === 'string' && dappId.startsWith('0x')
            ? ethers.toUtf8String(dappId)
            : dappId,
          starRating: Number(starRating),
          reviewText,
          timestamp: event.blockNumber ? Number(event.blockNumber) : Math.floor(Date.now() / 1000)
        });
      }
    );
    return this.contract;
  }

  public async stopListening(): Promise<void> {
    this.contract.removeAllListeners();
  }

  // New methods for Dapp management
  public async registerDapp(
    name: string,
    description: string,
    url: string,
    imageURL: string,
    platform: string,
    category: string,
    signer: ethers.Signer
  ): Promise<ContractTransaction> {
    const signedContract = this.contract.connect(signer) as Contract;
    return signedContract.registerDapp(
      name,
      description,
      url,
      imageURL,
      platform,
      category
    );
  }

  public async updateDapp(
    dappId: string,
    name: string,
    description: string,
    url: string,
    imageURL: string,
    platform: string,
    category: string,
    signer: ethers.Signer
  ): Promise<ContractTransaction> {
    const signedContract = this.contract.connect(signer) as Contract;
    const dappIdBytes32 = ethers.isHexString(dappId) && dappId.length === 66
      ? dappId
      : ethers.keccak256(ethers.toUtf8Bytes(url));
    return signedContract.updateDapp(
      dappIdBytes32,
      name,
      description,
      url,
      imageURL,
      platform,
      category
    );
  }

  public async deleteDapp(
    dappId: string,
    signer: ethers.Signer
  ): Promise<ContractTransaction> {
    const signedContract = this.contract.connect(signer) as Contract;
    const dappIdBytes32 = ethers.isHexString(dappId) && dappId.length === 66
      ? dappId
      : ethers.keccak256(ethers.toUtf8Bytes(dappId));
    return signedContract.deleteDapp(dappIdBytes32);
  }

  // New methods for fetching Dapp information
  public async getAllDapps() {
    return this.contract.getAllDapps();
  }

  public async getDapp(dappId: string) {
    const dappIdBytes32 = ethers.isHexString(dappId) && dappId.length === 66
      ? dappId
      : ethers.keccak256(ethers.toUtf8Bytes(dappId));
    return this.contract.getDapp(dappIdBytes32);
  }

  public async isDappRegistered(dappId: string): Promise<boolean> {
    const dappIdBytes32 = ethers.isHexString(dappId) && dappId.length === 66
      ? dappId
      : ethers.keccak256(ethers.toUtf8Bytes(dappId));
    return this.contract.isDappRegistered(dappIdBytes32);
  }
}

// Export types
export * from './types';