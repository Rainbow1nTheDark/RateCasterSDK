import { ethers, Contract, ContractTransaction } from 'ethers';
import { 
  ChainInfo, 
  SDKConfig,
  DappReview,
  DappRegistered,
  GraphQLRequestConfig,
  GraphQLResponse,
  DappRating
} from './types';
import { CHAIN_CONFIGS, CONTRACT_ABI } from './constants';

export class RateCaster {
  private provider: ethers.JsonRpcProvider;
  private contract!: Contract;
  private chainConfig!: ChainInfo;
  private initialized: Promise<void>;

  constructor(
    provider: ethers.JsonRpcProvider,
  ) {
    if (!provider) {
      throw new Error('Provider is not initialized');
    }
    this.provider = provider;

    // Initialize asynchronously
    this.initialized = this.initialize();
  }

  private async initialize(): Promise<void> {
    const getNetwork = async () => {
      const network = await this.provider.getNetwork();
      if (!network || typeof network.chainId === 'undefined') {
        throw new Error('Failed to get network from provider');
      }
      return network;
    }

    const network = await getNetwork();
    const chainId = Number(network.chainId);
    console.debug(`Detected chain ID: ${chainId}`);

    // Get chain configuration
    this.chainConfig = CHAIN_CONFIGS[chainId];
    if (!this.chainConfig) {
      throw new Error(`Configuration not found for chain: ${chainId}`);
    }

    // Initialize contract
    this.contract = new Contract(
      this.chainConfig.contractAddress,
      CONTRACT_ABI,
      this.provider
    );
  }

  // Add this to ensure all public methods wait for initialization
  private async ensureInitialized(): Promise<void> {
    await this.initialized;
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
  ): Promise<ethers.ContractTransactionResponse> {
    await this.ensureInitialized();
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
      return await signedContract.addDappRating(
        dappIdBytes32,
        starRating,
        reviewText
      );
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
    await this.ensureInitialized();
    const signedContract = this.contract.connect(signer) as Contract;
    return signedContract.revokeDappRating(ratingUid);
  }

  public async getProjectReviews(projectId: string): Promise<DappRating[]> {
    await this.ensureInitialized();
    try {
      const query = `{ dappRatingSubmitteds {id, attestationId, dappId, starRating, reviewText}}`;
      const response = await this.fetchGraphQL<{ dappRatingSubmitteds: DappRating[] }>({
        endpoint: this.getGraphqlUrl(),
        query
      });
      
      // Filter reviews for this project
      const allReviews = response?.data.dappRatingSubmitteds || [];
      return allReviews.filter(review => review.dappId === projectId);
    } catch (error) {
      console.log(`GraphQL Error: ${error}`);
      return [];
    }
  }

  public async getUserReviews(userAddress: string): Promise<DappRating[]> {
    await this.ensureInitialized();
    try {
      const query = `{ 
        dappRatingSubmitteds(where: { rater: "${userAddress.toLowerCase()}" }) {
          id
          rater
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
    const projectIdBytes32 = ethers.isHexString(projectId) && projectId.length === 66
      ? projectId
      : ethers.keccak256(ethers.toUtf8Bytes(projectId));
    return this.contract.raterToProjectToRated(userAddress, projectIdBytes32);
  }

  public async getUserRatingCount(userAddress: string): Promise<number> {
    await this.ensureInitialized();
    const count = await this.contract.raterToNumberOfRates(userAddress);
    return Number(count);
  }

  public async getProjectRatingCount(projectId: string): Promise<number> {
    await this.ensureInitialized();
    const projectIdBytes32 = ethers.isHexString(projectId) && projectId.length === 66
      ? projectId
      : ethers.keccak256(ethers.toUtf8Bytes(projectId));
    const count = await this.contract.projectToNumberOfRates(projectIdBytes32);
    return Number(count);
  }


  public getCurrentChain(): ChainInfo {
    return this.chainConfig;
  }

  // Utility methods
  public async validateConnection(): Promise<boolean> {
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
  ): Promise<ethers.ContractTransactionResponse> {
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
  ): Promise<ethers.ContractTransactionResponse> {
    await this.ensureInitialized();
    const signedContract = this.contract.connect(signer) as Contract;
    const dappIdBytes32 = ethers.isHexString(dappId) && dappId.length === 66
      ? dappId
      : ethers.keccak256(ethers.toUtf8Bytes(dappId));
    return signedContract.deleteDapp(dappIdBytes32);
  }

  // New methods for fetching Dapp information
  public async getAllDapps(includeRatings: boolean = true): Promise<DappRegistered[]> {
    await this.ensureInitialized();
    try {
      const query = `{ dappRegistereds { dappId, description, name, url, platform, category } }`;
      const response = await this.fetchGraphQL<{ dappRegistereds: DappRegistered[] }>({
        endpoint: this.getGraphqlUrl(),
        query
      });

      if (!includeRatings) {
        return response?.data.dappRegistereds || [];
      }

      // Fetch all ratings at once for better performance
      const allRatings = await this.getAllReviews();
      
      // Calculate ratings for each dapp
      const dappsWithRatings = (response?.data.dappRegistereds || []).map(dapp => {
        const dappRatings = allRatings.filter(r => r.dappId === dapp.dappId);
        const totalReviews = dappRatings.length;
        const averageRating = totalReviews > 0
          ? dappRatings.reduce((sum, r) => sum + Number(r.starRating), 0) / totalReviews
          : 0;

        return {
          ...dapp,
          averageRating,
          totalReviews
        };
      });

      return dappsWithRatings;
    } catch (error) {
      console.log(`GraphQL Error: ${error}`);
      return [];
    }
  }

  public async getDapp(dappId: string, includeRatings: boolean = true): Promise<DappRegistered | null> {
    await this.ensureInitialized();
    try {
      const query = `{ dappRegistered(id:"${dappId}") { id, dappId, description, name, url, platform, category } }`;
      const response = await this.fetchGraphQL<{ dappRegistered: DappRegistered }>({
        endpoint: this.getGraphqlUrl(),
        query
      });

      if (!response?.data.dappRegistered || !includeRatings) {
        return response?.data.dappRegistered || null;
      }

      // Fetch ratings for this specific dapp
      const ratings = await this.getProjectReviews(dappId);
      const totalReviews = ratings.length;
      const averageRating = totalReviews > 0
        ? ratings.reduce((sum, r) => sum + Number(r.starRating), 0) / totalReviews
        : 0;

      return {
        ...response.data.dappRegistered,
        averageRating,
        totalReviews
      };
    } catch (error) {
      console.log(`GraphQL Error: ${error}`);
      return null;
    }
  }

  public async isDappRegistered(dappId: string): Promise<boolean> {
    await this.ensureInitialized();
    const dappIdBytes32 = ethers.isHexString(dappId) && dappId.length === 66
      ? dappId
      : ethers.keccak256(ethers.toUtf8Bytes(dappId));
    return this.contract.isDappRegistered(dappIdBytes32);
  }

  public async getAllReviews(): Promise<DappRating[]> {
    await this.ensureInitialized();
    try {
      const query = `{ dappRatingSubmitteds {id, attestationId, dappId, starRating, reviewText}}`;
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
}

// Export types
export * from './types';