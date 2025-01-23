import { ethers, Contract, ContractTransaction } from 'ethers';
import { 
  ChainName, 
  ChainInfo, 
  SDKConfig,
  DappReview,
  DappRegistered,
  GraphQLRequestConfig,
  GraphQLResponse,
  DappRating
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
    chainName: ChainName,
    config?: SDKConfig
  ) {
    this.provider = provider;
    this.chainName = chainName;

    // Override contract addresses if provided
    if (config?.contractAddresses) {
      Object.keys(config.contractAddresses).forEach((chain) => {
        const chainKey = chain as ChainName;
        if (CHAIN_CONFIGS[chainKey] && config.contractAddresses?.[chainKey]) {
          CHAIN_CONFIGS[chainKey].contractAddress = config.contractAddresses[chainKey];
        }
      });
    }

    // Override subgraph URLs if provided
    if (config?.subgraphUrls) {
      Object.keys(config.subgraphUrls).forEach((chain) => {
        const chainKey = chain as ChainName;
        if (CHAIN_CONFIGS[chainKey] && config.subgraphUrls?.[chainKey]) {
          CHAIN_CONFIGS[chainKey].graphqlUrl = config.subgraphUrls[chainKey];
        }
      });
    }

    // Apply Alchemy key if provided
    if (config?.alchemyKey) {
      Object.keys(CHAIN_CONFIGS).forEach((chain) => {
        const chainKey = chain as ChainName;
        CHAIN_CONFIGS[chainKey].graphqlUrl = CHAIN_CONFIGS[chainKey].graphqlUrl.replace(
          '[YOUR_KEY]',
          config.alchemyKey!
        );
      });
    }

    // Get chain configuration
    this.chainConfig = CHAIN_CONFIGS[chainName];
    if (!this.chainConfig) {
      throw new Error(`Unsupported chain: ${chainName}`);
    }

    // Initialize contract
    this.contract = new Contract(
      this.chainConfig.contractAddress,
      CONTRACT_ABI,
      this.provider
    );
  }

  private getGraphqlUrl(): string {
    return this.chainConfig.graphqlUrl
      ?? this.chainConfig.graphqlUrl;
  }

  private async fetchGraphQL<T>(config: GraphQLRequestConfig): Promise<GraphQLResponse<T> | null> {
    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: config.query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = (await response.json()) as GraphQLResponse<T>;
      return responseData;
    } catch (error) {
      console.log(`GraphQL Error: ${error}`);
    }
    return null;
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

  public async getProjectReviews(projectId: string): Promise<DappRating[]> {
    try {
      const query = `{ dappRatingSubmitteds(where: { dappId: "${projectId}" }) {
        id
        attestationId
        dappId
        starRating
        reviewText
      }}`;
      
      const response = await this.fetchGraphQL<{ dappRatingSubmitteds: DappRating[] }>({
        endpoint: this.getGraphqlUrl(),
        query
      });
      return response?.data.dappRatingSubmitteds || [];
    } catch (error) {
      console.log(`GraphQL Error: ${error}`);
      return [];
    }
  }

  public async getUserReviews(userAddress: string): Promise<DappRating[]> {
    try {
      const query = `{ 
        dappRatingSubmitteds(where: { rater: "${userAddress.toLowerCase()}" }) {
          id
          attestationId
          dappId
          starRating
          reviewText
        }
      }`;

      const response = await this.fetchGraphQL<{ dappRatingSubmitteds: DappRating[] }>({
        endpoint: this.getGraphqlUrl(),
        query
      });
      return response?.data.dappRatingSubmitteds || [];
    } catch (error) {
      console.log(`GraphQL Error: ${error}`);
      return [];
    }
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
        return callback({
          id: attestationId,
          attestationId,
          dappId: typeof dappId === 'string' && dappId.startsWith('0x')
            ? ethers.toUtf8String(dappId)
            : dappId,
          starRating: Number(starRating),
          reviewText
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
  public async getAllDapps(): Promise<DappRegistered[]> {
    try {
      const query = `{ dappRegistereds { dappId, description, name, url, platform, category } }`;
      const response = await this.fetchGraphQL<{ dappRegistereds: DappRegistered[] }>({
        endpoint: this.getGraphqlUrl(),
        query
      });
      return response?.data.dappRegistereds || [];
    } catch (error) {
      console.log(`GraphQL Error: ${error}`);
      return [];
    }
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