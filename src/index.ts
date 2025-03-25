import { ethers, Contract, ContractTransaction } from 'ethers';
import { 
  ChainInfo, 
  DappReview,
  DappRegistered,
  GraphQLRequestConfig,
  GraphQLResponse,
  DappRating,
  LogLevel
} from './types';
import { CHAIN_CONFIGS, CONTRACT_ABI } from './constants';
import { Logger } from './utils/logger';

export class RateCaster {
  private provider: ethers.JsonRpcProvider;
  private contract!: Contract;
  private chainConfig!: ChainInfo;
  private initialized: Promise<void>;
  private logger: Logger;

  constructor(
    provider: ethers.JsonRpcProvider,
    options: {
      logLevel?: LogLevel;
      sdkVersion?: string;
    } = {}
  ) {
    if (!provider) {
      throw new Error('Provider is not initialized');
    }
    this.provider = provider;
    
    // Initialize logger with custom options
    this.logger = new Logger({
      level: options.logLevel || 'info',
      prefix: `RateCaster SDK${options.sdkVersion ? ` v${options.sdkVersion}` : ''}`,
      includeTimestamps: true
    });

    this.logger.debug('SDK initialization started');
    
    // Initialize asynchronously
    this.initialized = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const startTime = performance.now();
      const getNetwork = async () => {
        const network = await this.provider.getNetwork();
        if (!network || typeof network.chainId === 'undefined') {
          throw new Error('Failed to get network from provider');
        }
        return network;
      }

      const network = await getNetwork();
      const chainId = Number(network.chainId);
      this.logger.debug(`Network detection completed, chain ID: ${chainId}`);

      // Get chain configuration
      this.chainConfig = CHAIN_CONFIGS[chainId];
      if (!this.chainConfig) {
        throw new Error(`Configuration not found for chain: ${chainId}`);
      }
      this.logger.info(`Connected to ${this.chainConfig.name} (Chain ID: ${chainId})`);

      // Initialize contract
      this.contract = new Contract(
        this.chainConfig.contractAddress,
        CONTRACT_ABI,
        this.provider
      );
      this.logger.debug(`Contract initialized at ${this.chainConfig.contractAddress}`);
      
      const endTime = performance.now();
      this.logger.debug(`SDK initialization completed in ${(endTime - startTime).toFixed(2)}ms`);
    } catch (error) {
      this.logger.error('SDK initialization failed', error);
      throw error;
    }
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
    const startTime = performance.now();
    const requestId = Math.random().toString(36).substring(2, 10);
    
    try {
      this.logger.debug(`GraphQL request [${requestId}] to ${config.endpoint.split('/').slice(-2).join('/')}`);
      this.logger.debug(`Query [${requestId}]: ${config.query.substring(0, 100)}${config.query.length > 100 ? '...' : ''}`);
      
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: config.query }),
      });

      if (!response.ok) {
        this.logger.error(`GraphQL request [${requestId}] failed with status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = (await response.json()) as GraphQLResponse<T>;
      const endTime = performance.now();
      
      if (responseData.errors) {
        this.logger.error(`GraphQL request [${requestId}] returned errors:`, responseData.errors);
      }
      
      this.logger.debug(`GraphQL request [${requestId}] completed in ${(endTime - startTime).toFixed(2)}ms`);
      return responseData;
    } catch (error) {
      const endTime = performance.now();
      this.logger.error(`GraphQL request [${requestId}] failed after ${(endTime - startTime).toFixed(2)}ms:`, error);
      return null;
    }
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
      this.logger.error(`Invalid star rating: ${starRating}`);
      throw new Error('Star rating must be between 1 and 5');
    }

    try {
      const signerAddress = await signer.getAddress();
      this.logger.info(`Submitting review for dapp ID: ${dappId} from address: ${signerAddress}`);
      
      const signedContract = this.contract.connect(signer) as Contract;
      const dappIdBytes32 = ethers.isHexString(dappId) && dappId.length === 66
        ? dappId
        : ethers.keccak256(ethers.toUtf8Bytes(dappId));
      
      this.logger.debug(`Using dappId (bytes32): ${dappIdBytes32}`);
      
      // Get current fee from contract and add it to the transaction
      const ratingFee = await this.contract.dappRatingFee();
      this.logger.debug(`Current rating fee: ${ethers.formatEther(ratingFee)} ETH`);
      
      // Send transaction with fee
      const tx = await signedContract.addDappRating(
        dappIdBytes32,
        starRating,
        reviewText,
        { value: ratingFee }
      );
      
      this.logger.info(`Review submission transaction sent: ${tx.hash}`);
      this.logger.debug(`Transaction details: gas limit ${tx.gasLimit}, nonce: ${tx.nonce}`);
      
      return tx;
    } catch (error: any) {
      this.logger.error('Review submission failed:', {
        error: error.message || error,
        dappId,
        starRating,
        contractAddress: this.contract.target
      });
      
      // Enhanced error details for debugging
      if (error.code) {
        this.logger.debug(`Error code: ${error.code}`);
      }
      if (error.reason) {
        this.logger.debug(`Error reason: ${error.reason}`);
      }
      if (error.transaction) {
        this.logger.debug(`Failed transaction: ${JSON.stringify(error.transaction)}`);
      }
      
      throw new Error(`Failed to submit review: ${error.message || error}`);
    }
  }

  public async revokeReview(
    ratingUid: string,
    signer: ethers.Signer
  ): Promise<ContractTransaction> {
    await this.ensureInitialized();
    try {
      const signerAddress = await signer.getAddress();
      this.logger.info(`Revoking review with UID: ${ratingUid} from address: ${signerAddress}`);
      
      const signedContract = this.contract.connect(signer) as Contract;
      const tx = await signedContract.revokeDappRating(ratingUid);
      
      this.logger.info(`Review revocation transaction sent: ${tx.hash}`);
      return tx;
    } catch (error: any) {
      this.logger.error(`Failed to revoke review with UID ${ratingUid}:`, error);
      throw new Error(`Failed to revoke review: ${error.message || error}`);
    }
  }

  public async getProjectReviews(projectId: string): Promise<DappRating[]> {
    await this.ensureInitialized();
    this.logger.debug(`Fetching reviews for project ID: ${projectId}`);
    
    try {
      const query = `{ dappRatingSubmitteds {id, attestationId, dappId, starRating, reviewText}}`;
      const response = await this.fetchGraphQL<{ dappRatingSubmitteds: DappRating[] }>({
        endpoint: this.getGraphqlUrl(),
        query
      });
      
      // Filter reviews for this project
      const allReviews = response?.data.dappRatingSubmitteds || [];
      const projectReviews = allReviews.filter(review => review.dappId === projectId);
      
      this.logger.debug(`Found ${projectReviews.length} reviews for project ${projectId}`);
      return projectReviews;
    } catch (error) {
      this.logger.error(`Failed to fetch reviews for project ${projectId}:`, error);
      return [];
    }
  }

  public async getUserReviews(userAddress: string): Promise<DappRating[]> {
    await this.ensureInitialized();
    this.logger.debug(`Fetching reviews by user: ${userAddress}`);
    
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
      
      const userReviews = response?.data.dappRatingSubmitteds || [];
      this.logger.debug(`Found ${userReviews.length} reviews by user ${userAddress}`);
      return userReviews;
    } catch (error) {
      this.logger.error(`Failed to fetch reviews for user ${userAddress}:`, error);
      return [];
    }
  }

  public async getProjectStats(projectId: string) {
    await this.ensureInitialized();
    this.logger.debug(`Calculating statistics for project: ${projectId}`);
    
    const reviews = await this.getProjectReviews(projectId);
    const totalReviews = reviews.length;
    
    if (totalReviews === 0) {
      this.logger.debug(`No reviews found for project ${projectId}`);
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }
    
    const averageRating = reviews.reduce((acc, review) => acc + review.starRating, 0) / totalReviews;
    
    const result = {
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
    
    this.logger.debug(`Project ${projectId} stats: avg rating ${result.averageRating.toFixed(2)}, total reviews: ${totalReviews}`);
    return result;
  }

  // Contract state reading methods
  public async hasUserRatedProject(userAddress: string, projectId: string): Promise<boolean> {
    await this.ensureInitialized();
    try {
      const projectIdBytes32 = ethers.isHexString(projectId) && projectId.length === 66
        ? projectId
        : ethers.keccak256(ethers.toUtf8Bytes(projectId));
        
      this.logger.debug(`Checking if user ${userAddress} has rated project ${projectId}`);
      const rated = await this.contract.raterToProjectToRated(userAddress, projectIdBytes32);
      
      this.logger.debug(`User ${userAddress} has${rated ? '' : ' not'} rated project ${projectId}`);
      return rated;
    } catch (error) {
      this.logger.error(`Error checking if user has rated project:`, {
        userAddress,
        projectId,
        error
      });
      return false;
    }
  }

  public async getUserRatingCount(userAddress: string): Promise<number> {
    await this.ensureInitialized();
    try {
      this.logger.debug(`Fetching rating count for user: ${userAddress}`);
      const count = await this.contract.raterToNumberOfRates(userAddress);
      
      this.logger.debug(`User ${userAddress} has submitted ${count} ratings`);
      return Number(count);
    } catch (error) {
      this.logger.error(`Error fetching user rating count:`, {
        userAddress,
        error
      });
      return 0;
    }
  }

  public async getProjectRatingCount(projectId: string): Promise<number> {
    await this.ensureInitialized();
    try {
      const projectIdBytes32 = ethers.isHexString(projectId) && projectId.length === 66
        ? projectId
        : ethers.keccak256(ethers.toUtf8Bytes(projectId));
        
      this.logger.debug(`Fetching rating count for project: ${projectId}`);
      const count = await this.contract.dappRatingsCount(projectIdBytes32);
      
      this.logger.debug(`Project ${projectId} has ${count} ratings`);
      return Number(count);
    } catch (error) {
      this.logger.error(`Error fetching project rating count:`, {
        projectId,
        error
      });
      return 0;
    }
  }

  public getCurrentChain(): ChainInfo {
    return this.chainConfig;
  }

  // Utility methods
  public async validateConnection(): Promise<boolean> {
    await this.ensureInitialized();
    try {
      this.logger.debug('Validating network connection');
      const network = await this.provider.getNetwork();
      const expectedChainId = this.chainConfig.chainId;
      
      const isValid = network.chainId === BigInt(expectedChainId);
      this.logger.debug(`Connection validation ${isValid ? 'succeeded' : 'failed'}: expected chain ID ${expectedChainId}, got ${network.chainId}`);
      
      return isValid;
    } catch (error) {
      this.logger.error('Connection validation failed:', error);
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
    this.logger.info('Started listening for new reviews');
    
    this.contract.on("DappRatingSubmitted", 
      (
        attestationId: string,
        dappId: string,
        starRating: number,
        reviewText: string,
        event: ethers.EventLog
      ) => {
        this.logger.debug(`Received new review event: attestation ${attestationId.substring(0, 10)}...`);
        
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
    this.logger.info('Stopped listening for events');
    this.contract.removeAllListeners();
  }

  // New methods for Dapp management
  public async registerDapp(
    name: string,
    description: string,
    url: string,
    imageURL: string,
    category: string,
    signer: ethers.Signer
  ): Promise<ethers.ContractTransactionResponse> {
    await this.ensureInitialized();
    try {
      const signerAddress = await signer.getAddress();
      this.logger.info(`Registering dapp "${name}" from address: ${signerAddress}`);
      
      const signedContract = this.contract.connect(signer) as Contract;
      
      // Get current registration fee and include it in the transaction
      const registrationFee = await this.contract.dappRegistrationFee();
      this.logger.debug(`Current registration fee: ${ethers.formatEther(registrationFee)} ETH`);
      
      // Send transaction with registration fee
      const tx = await signedContract.registerDapp(
        name,
        description,
        url,
        imageURL,
        category,
        { value: registrationFee }
      );
      
      this.logger.info(`Dapp registration transaction sent: ${tx.hash}`);
      this.logger.debug(`Transaction details: gas limit ${tx.gasLimit}, nonce: ${tx.nonce}`);
      
      return tx;
    } catch (error: any) {
      this.logger.error('Error registering dapp:', {
        name,
        url,
        error: error.message || error
      });
      
      // Enhanced error details
      if (error.code) {
        this.logger.debug(`Error code: ${error.code}`);
      }
      if (error.reason) {
        this.logger.debug(`Error reason: ${error.reason}`);
      }
      
      throw new Error(`Failed to register dapp: ${error.message || error}`);
    }
  }

  public async updateDapp(
    dappId: string,
    name: string,
    description: string,
    url: string,
    imageURL: string,
    category: string,
    signer: ethers.Signer
  ): Promise<ContractTransaction> {
    await this.ensureInitialized();
    try {
      const signerAddress = await signer.getAddress();
      this.logger.info(`Updating dapp with ID: ${dappId} from address: ${signerAddress}`);
      
      const signedContract = this.contract.connect(signer) as Contract;
      const dappIdBytes32 = ethers.isHexString(dappId) && dappId.length === 66
        ? dappId
        : ethers.keccak256(ethers.toUtf8Bytes(url));
        
      this.logger.debug(`Using dappId (bytes32): ${dappIdBytes32}`);
      
      const tx = await signedContract.updateDapp(
        dappIdBytes32,
        name,
        description,
        url,
        imageURL,
        category
      );
      
      this.logger.info(`Dapp update transaction sent: ${tx.hash}`);
      return tx;
    } catch (error: any) {
      this.logger.error('Error updating dapp:', {
        dappId,
        name,
        error: error.message || error
      });
      throw new Error(`Failed to update dapp: ${error.message || error}`);
    }
  }

  public async deleteDapp(
    dappId: string,
    signer: ethers.Signer
  ): Promise<ethers.ContractTransactionResponse> {
    await this.ensureInitialized();
    try {
      const signerAddress = await signer.getAddress();
      this.logger.info(`Deleting dapp with ID: ${dappId} from address: ${signerAddress}`);
      
      const signedContract = this.contract.connect(signer) as Contract;
      const dappIdBytes32 = ethers.isHexString(dappId) && dappId.length === 66
        ? dappId
        : ethers.keccak256(ethers.toUtf8Bytes(dappId));
        
      this.logger.debug(`Using dappId (bytes32): ${dappIdBytes32}`);

      // Send transaction with default gas settings
      const tx = await signedContract.deleteDapp(dappIdBytes32);
      
      this.logger.info(`Dapp deletion transaction sent: ${tx.hash}`);
      return tx;
    } catch (error: any) {
      this.logger.error('Error deleting dapp:', {
        dappId,
        error: error.message || error
      });
      throw new Error(`Failed to delete dapp: ${error.message || error}`);
    }
  }

  // New methods for fetching Dapp information
  public async getAllDapps(includeRatings: boolean = true): Promise<DappRegistered[]> {
    await this.ensureInitialized();
    this.logger.debug(`Fetching all dapps (with ratings: ${includeRatings})`);
    
    try {
      const startTime = performance.now();
      
      // Use contract method instead of GraphQL
      const dapps = await this.contract.getAllDapps();
      this.logger.debug(`Retrieved ${dapps.length} dapps from contract`);
  
      // Transform contract response to DappRegistered type
      const transformedDapps: DappRegistered[] = dapps.map((dapp: { dappId: any; name: any; description: any; url: any; imageUrl: any; category: any; owner: any; }) => ({
        dappId: dapp.dappId,
        name: dapp.name,
        description: dapp.description,
        url: dapp.url,
        imageUrl: dapp.imageUrl,
        category: dapp.category,
        owner: dapp.owner
      }));
  
      if (!includeRatings) {
        return transformedDapps;
      }
  
      // If ratings are requested, fetch them for each dapp
      const dappsWithRatings = await Promise.all(
        transformedDapps.map(async (dapp) => {
          const ratings = await this.getProjectReviews(dapp.dappId);
          const totalReviews = ratings.length;
          const averageRating = totalReviews > 0
            ? ratings.reduce((sum, r) => sum + Number(r.starRating), 0) / totalReviews
            : 0;
  
          return {
            ...dapp,
            averageRating,
            totalReviews
          };
        })
      );
  
      const endTime = performance.now();
      this.logger.debug(`Processed dapp data in ${(endTime - startTime).toFixed(2)}ms`);
      
      return dappsWithRatings;
    } catch (error) {
      this.logger.error('Failed to fetch dapps:', error);
      throw [];
    }
  }

  public async getDapp(dappId: string, includeRatings: boolean = true): Promise<DappRegistered | null> {
    await this.ensureInitialized();
    this.logger.debug(`Fetching dapp with ID: ${dappId} (with ratings: ${includeRatings})`);
    
    try {
      // Convert dappId to bytes32 if needed
      const dappIdBytes32 = ethers.isHexString(dappId) && dappId.length === 66
        ? dappId
        : ethers.keccak256(ethers.toUtf8Bytes(dappId));
      
      // Use contract method instead of GraphQL
      const dapp = await this.contract.getDapp(dappIdBytes32);
      
      // Transform contract response to DappRegistered type
      const transformedDapp: DappRegistered = {
        dappId: dapp.dappId,
        name: dapp.name,
        description: dapp.description,
        url: dapp.url,
        imageUrl: dapp.imageUrl,
        category: dapp.category,
        owner: dapp.owner
      };

      if (!includeRatings) {
        return transformedDapp;
      }

      // Fetch ratings if requested
      this.logger.debug(`Fetching ratings for dapp ID: ${dappId}`);
      const ratings = await this.getProjectReviews(dappId);
      this.logger.debug(`Retrieved ${ratings.length} ratings for dapp ID: ${dappId}`);
      
      const totalReviews = ratings.length;
      const averageRating = totalReviews > 0
        ? ratings.reduce((sum, r) => sum + Number(r.starRating), 0) / totalReviews
        : 0;

      return {
        ...transformedDapp,
        averageRating,
        totalReviews
      };
    } catch (error: unknown) {
      // Check if the error is because the dapp doesn't exist
      if (error instanceof Error && error.message?.includes("Dapp not registered")) {
        this.logger.debug(`Dapp with ID ${dappId} not found`);
        return null;
      }
      this.logger.error(`Failed to fetch dapp with ID ${dappId}:`, error);
      throw error;
    }
  }

  public async isDappRegistered(dappId: string): Promise<boolean> {
    await this.ensureInitialized();
    try {
      const dappIdBytes32 = ethers.isHexString(dappId) && dappId.length === 66
        ? dappId
        : ethers.keccak256(ethers.toUtf8Bytes(dappId));
        
      this.logger.debug(`Checking if dapp is registered with ID: ${dappId}`);
      const isRegistered = await this.contract.isDappRegistered(dappIdBytes32);
      
      this.logger.debug(`Dapp ${dappId} is ${isRegistered ? '' : 'not '}registered`);
      return isRegistered;
    } catch (error) {
      this.logger.error(`Error checking if dapp is registered:`, {
        dappId,
        error
      });
      return false;
    }
  }

  public async getAllReviews(): Promise<DappRating[]> {
    await this.ensureInitialized();
    this.logger.debug('Fetching all reviews');
    
    try {
      const query = `{ dappRatingSubmitteds {id, attestationId, dappId, starRating, reviewText}}`;
      const response = await this.fetchGraphQL<{ dappRatingSubmitteds: DappRating[] }>({
        endpoint: this.getGraphqlUrl(),
        query
      });
      
      const reviews = response?.data.dappRatingSubmitteds || [];
      this.logger.debug(`Retrieved ${reviews.length} total reviews`);
      return reviews;
    } catch (error) {
      this.logger.error('Failed to fetch all reviews:', error);
      return [];
    }
  }
  
  // Logger control methods for users
  public setLogLevel(level: LogLevel): void {
    this.logger.setLevel(level);
    this.logger.debug(`Log level set to: ${level}`);
  }
  
  public getLogLevel(): LogLevel {
    return this.logger.getLevel();
  }
}

// Export types
export * from './types';