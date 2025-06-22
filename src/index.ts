
import { ethers, Contract, ContractTransaction } from 'ethers';
import {
  ChainInfo,
  DappReview as SDKDappReviewType, // Renaming for explicit re-export
  DappRegistered as SDKDappRegisteredType, // Renaming for explicit re-export
  GraphQLRequestConfig,
  GraphQLResponse,
  LogLevel,
  CATEGORY_NAMES,
  CategoryOption,
  getAllMainCategories,
  getCategoriesByMainCategory
} from './types';
import { CHAIN_CONFIGS, CONTRACT_ABI } from './constants';
import { Logger } from './utils/logger';

export const VERSION = '1.0.0';

// Explicit re-export for potentially problematic types
export type DappReview = SDKDappReviewType;
export type DappRegistered = SDKDappRegisteredType;

export class RateCaster {
  private provider: ethers.JsonRpcProvider;
  private contract!: Contract;
  private contract_socket?: Contract;
  private chainConfig!: ChainInfo;
  private initialized: Promise<void>;
  private logger: Logger;
  private provider_socket: ethers.WebSocketProvider | undefined;
  private reviewListener: ethers.Listener | null = null;

  /**
   * Initializes the RateCaster SDK with a provider.
   * @param provider - The JSON-RPC provider for blockchain interactions.
   * @param provider_socket - Optional WebSocket provider for event listening.
   * @throws Error if the provider is not initialized.
   */
  constructor(
    provider: ethers.JsonRpcProvider,
    provider_socket?: ethers.WebSocketProvider
  ) {
    if (!provider) {
      throw new Error('Provider is not initialized');
    }
    this.provider = provider;
    this.provider_socket = provider_socket;
    this.logger = new Logger({
      level: 'info',
      prefix: `RateCaster SDK}`,
      includeTimestamps: true
    });

    this.logger.debug('SDK initialization started');
    this.initialized = this.initialize();
  }

  /**
   * Updates the default provider and reinitializes the contract.
   * @param newProvider - The new JSON-RPC provider.
   * @throws Error if the provider is invalid or initialization fails.
   */
  public async setProvider(newProvider: ethers.JsonRpcProvider): Promise<void> {
    try {
      this.logger.debug('Updating default provider');
      await newProvider.getNetwork();
      this.provider = newProvider;
      await this.initialize();
      this.logger.info('Default provider updated successfully');
    } catch (error) {
      this.logger.error('Failed to set new provider:', error);
      throw new Error(`Failed to set provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async initialize(): Promise<void> {
    try {
      const startTime = performance.now();
      const getNetwork = async (provider: ethers.JsonRpcProvider) => {
        const network = await provider.getNetwork();
        if (!network || typeof network.chainId === 'undefined') {
          throw new Error('Failed to get network from provider');
        }
        return network;
      };

      const network = await getNetwork(this.provider);
      const chainId = Number(network.chainId);
      this.logger.debug(`Network detection completed, chain ID: ${chainId}`);

      this.chainConfig = CHAIN_CONFIGS[chainId];
      if (!this.chainConfig) {
        throw new Error(`Configuration not found for chain: ${chainId}`);
      }
      this.logger.info(`Connected to ${this.chainConfig.name} (Chain ID: ${chainId})`);

      this.contract = new Contract(
        this.chainConfig.contractAddress,
        CONTRACT_ABI,
        this.provider
      );
      this.logger.debug(`Contract initialized at ${this.chainConfig.contractAddress}`);

      if (this.provider_socket) {
        this.contract_socket = new Contract(
          this.chainConfig.contractAddress,
          CONTRACT_ABI,
          this.provider_socket
        );
        this.logger.debug(`Contract socket initialized at ${this.chainConfig.contractAddress}`);
      }

      const endTime = performance.now();
      this.logger.debug(`SDK initialization completed in ${(endTime - startTime).toFixed(2)}ms`);
    } catch (error) {
      this.logger.error('SDK initialization failed', error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    await this.initialized;
  }

  private getGraphqlUrl(): string {
    if (!this.chainConfig.graphqlUrl) {
      this.logger.error('GraphQL URL not configured for this chain');
      throw new Error('GraphQL URL not configured for this chain');
    }
    return this.chainConfig.graphqlUrl;
  }

  private async fetchGraphQL<T>(
    config: GraphQLRequestConfig & { variables?: Record<string, any> }
  ): Promise<GraphQLResponse<T>> {
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
        body: JSON.stringify({
          query: config.query,
          variables: config.variables
        }),
      });

      if (!response.ok) {
        this.logger.error(`GraphQL request [${requestId}] failed with status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = (await response.json()) as GraphQLResponse<T>;
      const endTime = performance.now();

      if (responseData.errors) {
        this.logger.error(`GraphQL request [${requestId}] returned errors:`, responseData.errors);
        throw new Error(`GraphQL errors: ${JSON.stringify(responseData.errors)}`);
      }

      this.logger.debug(`GraphQL request [${requestId}] completed in ${(endTime - startTime).toFixed(2)}ms`);
      return responseData;
    } catch (error) {
      const endTime = performance.now();
      this.logger.error(`GraphQL request [${requestId}] failed after ${(endTime - startTime).toFixed(2)}ms:`, error);
      throw new Error(`Failed to fetch GraphQL data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submits a review for a dApp with a star rating and text.
   * @param dappId - The ID of the dApp (string or bytes32).
   * @param starRating - The rating (1–5).
   * @param reviewText - The review text.
   * @param signer - The signer for the transaction.
   * @param overrides - Optional transaction overrides (e.g., gasLimit, gasPrice).
   * @param customProvider - Optional provider to override the default.
   * @returns A promise resolving to the transaction response.
   * @throws Error if inputs are invalid or the transaction fails.
   */
  public async submitReview(
    dappId: string,
    starRating: number,
    reviewText: string,
    signer: ethers.Signer,
    overrides?: ethers.Overrides,
    customProvider?: ethers.JsonRpcProvider
  ): Promise<ethers.ContractTransactionResponse> {
    await this.ensureInitialized();
    if (!dappId) throw new Error('dappId must be non-empty');
    if (starRating < 1 || starRating > 5) throw new Error('Star rating must be between 1 and 5');

    try {
      const signerAddress = await signer.getAddress();
      this.logger.info(`Submitting review for dapp ID: ${dappId} from address: ${signerAddress}`);
      let contract = this.contract;

      if (customProvider) {
          contract = new Contract(this.chainConfig.contractAddress, CONTRACT_ABI, customProvider);
      }

      const signedContract = contract.connect(signer) as Contract;
      const dappIdBytes32 = ethers.isHexString(dappId) && dappId.length === 66
        ? dappId
        : ethers.keccak256(ethers.toUtf8Bytes(dappId));

      this.logger.debug(`Using dappId (bytes32): ${dappIdBytes32}`);

      const ratingFee = await signedContract.dappRatingFee();
      this.logger.debug(`Current rating fee: ${ethers.formatEther(ratingFee)} ETH`);

      const tx = await signedContract.addDappRating(
        dappIdBytes32,
        starRating,
        reviewText,
        { value: ratingFee, ...overrides }
      );

      this.logger.info(`Review submission transaction sent: ${tx.hash}`);
      this.logger.debug(`Transaction details: gas limit ${tx.gasLimit}, nonce: ${tx.nonce}, overrides: ${JSON.stringify(overrides || {})}`);

      return tx as ethers.ContractTransactionResponse;
    } catch (error: any) {
      this.logger.error('Review submission failed:', {
        error: error.message || error,
        dappId,
        starRating,
        contractAddress: this.contract.target
      });
      if (error.code) this.logger.debug(`Error code: ${error.code}`);
      if (error.reason) this.logger.debug(`Error reason: ${error.reason}`);
      if (error.transaction) this.logger.debug(`Failed transaction: ${JSON.stringify(error.transaction)}`);

      throw new Error(`Failed to submit review: ${error.message || error}`);
    }
  }

  /**
   * Revokes a previously submitted review.
   * @param ratingUid - The unique ID of the review to revoke.
   * @param signer - The signer for the transaction.
   * @param overrides - Optional transaction overrides.
   * @param customProvider - Optional provider to override the default.
   * @returns A promise resolving to the transaction response.
   * @throws Error if the transaction fails.
   */
  public async revokeReview(
    ratingUid: string,
    signer: ethers.Signer,
    overrides?: ethers.Overrides,
    customProvider?: ethers.JsonRpcProvider
  ): Promise<ethers.ContractTransactionResponse> {
    await this.ensureInitialized();
    if (!ratingUid) throw new Error('ratingUid must be non-empty');

    try {
      const provider = customProvider || this.provider;
      const signerAddress = await signer.getAddress();
      this.logger.info(`Revoking review with UID: ${ratingUid} from address: ${signerAddress}`);

      const contract = new Contract(this.chainConfig.contractAddress, CONTRACT_ABI, provider);
      const signedContract = contract.connect(signer) as Contract;
      const tx = await signedContract.revokeDappRating(ratingUid, overrides);

      this.logger.info(`Review revocation transaction sent: ${tx.hash}`);
      this.logger.debug(`Transaction details: gas limit ${tx.gasLimit}, nonce: ${tx.nonce}, overrides: ${JSON.stringify(overrides || {})}`);
      return tx;
    } catch (error: any) {
      this.logger.error(`Failed to revoke review with UID ${ratingUid}:`, error);
      throw new Error(`Failed to revoke review: ${error.message || error}`);
    }
  }

  /**
   * Fetches reviews for a specific project.
   * @param projectId - The ID of the project.
   * @returns An array of reviews.
   * @throws Error if fetching reviews fails.
   */
  public async getProjectReviews(projectId: string): Promise<SDKDappReviewType[]> {
    await this.ensureInitialized();
    if (!projectId) throw new Error('projectId must be non-empty');

    try {
      const query = `
        query GetProjectReviews($projectId: String!) {
          dappRatingSubmitteds(where: { dappId: $projectId }) {
            id
            attestationId
            dappId
            starRating
            reviewText
            rater
          }
        }
      `;
      const response = await this.fetchGraphQL<{ dappRatingSubmitteds: SDKDappReviewType[] }>({
        endpoint: this.getGraphqlUrl(),
        query,
        variables: { projectId }
      });

      const projectReviews = response.data.dappRatingSubmitteds || [];
      this.logger.debug(`Found ${projectReviews.length} reviews for project ${projectId}`);
      return projectReviews;
    } catch (error) {
      this.logger.error(`Failed to fetch reviews for project ${projectId}:`, error);
      throw new Error(`Failed to fetch project reviews: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetches reviews submitted by a user.
   * @param userAddress - The user's Ethereum address.
   * @returns An array of reviews.
   * @throws Error if fetching reviews fails.
   */
  public async getUserReviews(userAddress: string): Promise<SDKDappReviewType[]> {
    await this.ensureInitialized();
    if (!ethers.isAddress(userAddress)) throw new Error('Invalid user address');

    try {
      const query = `
        query GetUserReviews($rater: String!) {
          dappRatingSubmitteds(where: { rater: $rater }) {
            id
            rater
            attestationId
            dappId
            starRating
            reviewText
          }
        }
      `;
      const response = await this.fetchGraphQL<{ dappRatingSubmitteds: SDKDappReviewType[] }>({
        endpoint: this.getGraphqlUrl(),
        query,
        variables: { rater: userAddress.toLowerCase() }
      });

      const userReviews = response.data.dappRatingSubmitteds || [];
      this.logger.debug(`Found ${userReviews.length} reviews by user ${userAddress}`);
      return userReviews;
    } catch (error) {
      this.logger.error(`Failed to fetch reviews for user ${userAddress}:`, error);
      throw new Error(`Failed to fetch user reviews: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculates statistics for a project's reviews.
   * @param projectId - The ID of the project.
   * @returns An object with total reviews, average rating, and rating distribution.
   * @throws Error if fetching reviews fails.
   */
  public async getProjectStats(projectId: string) {
    await this.ensureInitialized();
    if (!projectId) throw new Error('projectId must be non-empty');

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

  /**
   * Checks if a user has rated a project.
   * @param userAddress - The user's Ethereum address.
   * @param projectId - The ID of the project.
   * @param customProvider - Optional provider to override the default.
   * @returns True if the user has rated the project, false otherwise.
   * @throws Error if the query fails.
   */
  public async hasUserRatedProject(
    userAddress: string,
    projectId: string,
    customProvider?: ethers.JsonRpcProvider
  ): Promise<boolean> {
    await this.ensureInitialized();
    if (!ethers.isAddress(userAddress)) throw new Error('Invalid user address');
    if (!projectId) throw new Error('projectId must be non-empty');

    try {
      const provider = customProvider || this.provider;
      const contract = new Contract(this.chainConfig.contractAddress, CONTRACT_ABI, provider);
      const projectIdBytes32 = ethers.isHexString(projectId) && projectId.length === 66
        ? projectId
        : ethers.keccak256(ethers.toUtf8Bytes(projectId));

      this.logger.debug(`Checking if user ${userAddress} has rated project ${projectId}`);
      const rated = await contract.raterToProjectToRated(userAddress, projectIdBytes32);

      this.logger.debug(`User ${userAddress} has${rated ? '' : ' not'} rated project ${projectId}`);
      return rated;
    } catch (error) {
      this.logger.error(`Error checking if user has rated project:`, {
        userAddress,
        projectId,
        error
      });
      throw new Error(`Failed to check rating status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets the number of ratings submitted by a user.
   * @param userAddress - The user's Ethereum address.
   * @param customProvider - Optional provider to override the default.
   * @returns The number of ratings.
   * @throws Error if the query fails.
   */
  public async getUserRatingCount(
    userAddress: string,
    customProvider?: ethers.JsonRpcProvider
  ): Promise<number> {
    await this.ensureInitialized();
    if (!ethers.isAddress(userAddress)) throw new Error('Invalid user address');

    try {
      const provider = customProvider || this.provider;
      const contract = new Contract(this.chainConfig.contractAddress, CONTRACT_ABI, provider);
      this.logger.debug(`Fetching rating count for user: ${userAddress}`);
      const count = await contract.raterToNumberOfRates(userAddress);

      this.logger.debug(`User ${userAddress} has submitted ${count} ratings`);
      return Number(count);
    } catch (error) {
      this.logger.error(`Error fetching user rating count:`, {
        userAddress,
        error
      });
      throw new Error(`Failed to fetch rating count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets the number of ratings for a project.
   * @param projectId - The ID of the project.
   * @param customProvider - Optional provider to override the default.
   * @returns The number of ratings.
   * @throws Error if the query fails.
   */
  public async getProjectRatingCount(
    projectId: string,
    customProvider?: ethers.JsonRpcProvider
  ): Promise<number> {
    await this.ensureInitialized();
    if (!projectId) throw new Error('projectId must be non-empty');

    try {
      const provider = customProvider || this.provider;
      const contract = new Contract(this.chainConfig.contractAddress, CONTRACT_ABI, provider);
      const projectIdBytes32 = ethers.isHexString(projectId) && projectId.length === 66
        ? projectId
        : ethers.keccak256(ethers.toUtf8Bytes(projectId));

      this.logger.debug(`Fetching rating count for project: ${projectId}`);
      const count = await contract.dappRatingsCount(projectIdBytes32);

      this.logger.debug(`Project ${projectId} has ${count} ratings`);
      return Number(count);
    } catch (error) {
      this.logger.error(`Error fetching project rating count:`, {
        projectId,
        error
      });
      throw new Error(`Failed to fetch rating count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets the current chain configuration.
   * @returns The chain configuration.
   */
  public getCurrentChain(): ChainInfo {
    return this.chainConfig;
  }

  /**
   * Validates the connection to the blockchain.
   * @param customProvider - Optional provider to override the default.
   * @returns True if the connection is valid, false otherwise.
   * @throws Error if validation fails.
   */
  public async validateConnection(customProvider?: ethers.JsonRpcProvider): Promise<boolean> {
    await this.ensureInitialized();
    try {
      const provider = customProvider || this.provider;
      this.logger.debug('Validating network connection');
      const network = await provider.getNetwork();
      const expectedChainId = this.chainConfig.chainId;

      const isValid = network.chainId === BigInt(expectedChainId);
      this.logger.debug(`Connection validation ${isValid ? 'succeeded' : 'failed'}: expected chain ID ${expectedChainId}, got ${network.chainId}`);

      return isValid;
    } catch (error) {
      this.logger.error('Connection validation failed:', error);
      throw new Error(`Failed to validate connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets the contract address.
   * @returns The contract address.
   */
  public getContractAddress(): string {
    return this.contract.target as string;
  }

  /**
   * Gets the blockchain explorer URL.
   * @returns The explorer URL.
   */
  public getExplorerUrl(): string {
    return this.chainConfig.explorer;
  }

  /**
   * Listens for new review events.
   * @param callback - Function to call when a review is submitted.
   * @returns The contract instance.
   * @throws Error if WebSocket provider is not defined.
   */
  public async listenToReviews(
    callback: (review: SDKDappReviewType) => void
  ): Promise<Contract> {
    await this.ensureInitialized();
    if (!this.contract_socket) {
      throw new Error('Socket Provider is not defined, cannot listen to events. Please pass it to RateCaster constructor');
    }

    this.logger.info('Started listening for new reviews');

    this.reviewListener = async (
      event_rater: string,
      event_attestationId: string,
      event_dappId: string,
      event_starRating: number,
      event_reviewText: string,
      event: ethers.EventLog
    ) => {
      this.logger.debug(`SDK: DappRatingSubmitted event received: attestationId ${event_attestationId}`);
      let timestamp = Date.now(); // Fallback
      try {
        const block = await event.getBlock();
        if (block && typeof block.timestamp === 'number') {
          timestamp = block.timestamp * 1000; // Convert seconds to milliseconds
        } else {
            this.logger.warn(`SDK: Could not get block or timestamp for event: ${event_attestationId}`);
        }
      } catch(e: any) {
        this.logger.warn(`SDK: Error fetching block for event ${event_attestationId}: ${e.message}`);
      }
      const reviewForCallback: SDKDappReviewType = {
        id: event_attestationId,
        attestationId: event_attestationId,
        dappId: event_dappId,
        starRating: Number(event_starRating),
        reviewText: event_reviewText,
        rater: event_rater,
        timestamp: timestamp,
      };
      callback(reviewForCallback);
    };
    this.contract_socket.on("DappRatingSubmitted", this.reviewListener);
    return this.contract_socket;
  }

  /**
   * Stops listening for review events.
   * @param eventName - Optional: the specific event to stop listening to. If not provided, stops "DappRatingSubmitted".
   */
  public async stopListening(eventName?: string): Promise<void> {
    await this.ensureInitialized();
    const targetEvent = eventName || "DappRatingSubmitted";

    if (this.contract_socket && this.reviewListener && targetEvent === "DappRatingSubmitted") {
      this.contract_socket.off("DappRatingSubmitted", this.reviewListener);
      this.reviewListener = null; // Clear the stored listener specifically for DappRatingSubmitted
      this.logger.info('Stopped listening for DappRatingSubmitted events');
    } else if (this.contract_socket && eventName) {
      // This part could be expanded if the SDK handles other listeners generically
      this.logger.warn(`Stop listening called for an event ('${eventName}') not specifically managed by this targeted stopListening logic, or DappRatingSubmitted listener was not active.`);
    } else if (!this.contract_socket) {
        this.logger.warn('Socket contract not initialized, cannot stop listening.');
    }
  }


  /**
   * Registers a new dApp.
   * @param name - The dApp name.
   * @param description - The dApp description.
   * @param url - The dApp URL.
   * @param imageURL - The dApp image URL.
   * @param categoryId - The category ID.
   * @param signer - The signer for the transaction.
   * @param overrides - Optional transaction overrides.
   * @param customProvider - Optional provider to override the default.
   * @returns A promise resolving to the transaction response.
   * @throws Error if inputs are invalid or the transaction fails.
   */
  public async registerDapp(
    name: string,
    description: string,
    url: string,
    imageURL: string,
    categoryId: number,
    signer: ethers.Signer,
    overrides?: ethers.Overrides,
    customProvider?: ethers.JsonRpcProvider
  ): Promise<ethers.ContractTransactionResponse> {
    await this.ensureInitialized();
    if (!name || name.length > 100) throw new Error('Name must be non-empty and at most 100 characters');
    if (description.length > 1000) throw new Error('Description must be at most 1000 characters');
    if (!url || !/^https?:\/\//.test(url)) throw new Error('URL must be a valid HTTP/HTTPS URL');
    if (!imageURL || !/^https?:\/\//.test(imageURL)) throw new Error('Image URL must be a valid HTTP/HTTPS URL');
    if (!this.getAllCategories().some(cat => cat.id === categoryId)) throw new Error(`Invalid category ID: ${categoryId}`);

    try {
      const provider = customProvider || this.provider;
      const signerAddress = await signer.getAddress();
      this.logger.info(`Registering dapp "${name}" from address: ${signerAddress}`);

      const contract = new Contract(this.chainConfig.contractAddress, CONTRACT_ABI, provider);
      const signedContract = contract.connect(signer) as Contract;

      const registrationFee = await signedContract.dappRegistrationFee();
      this.logger.debug(`Current registration fee: ${ethers.formatEther(registrationFee)} ETH`);

      const tx = await signedContract.registerDapp(
        name,
        description,
        url,
        imageURL,
        categoryId,
        { value: registrationFee, ...overrides }
      );

      this.logger.info(`Dapp registration transaction sent: ${tx.hash}`);
      this.logger.debug(`Transaction details: gas limit ${tx.gasLimit}, nonce: ${tx.nonce}, overrides: ${JSON.stringify(overrides || {})}`);

      return tx;
    } catch (error: any) {
      this.logger.error('Error registering dapp:', {
        name,
        url,
        error: error.message || error
      });
      if (error.code) this.logger.debug(`Error code: ${error.code}`);
      if (error.reason) this.logger.debug(`Error reason: ${error.reason}`);

      throw new Error(`Failed to register dapp: ${error.message || error}`);
    }
  }

  /**
   * Updates an existing dApp.
   * @param dappId - The dApp ID.
   * @param name - The dApp name.
   * @param description - The dApp description.
   * @param url - The dApp URL.
   * @param imageURL - The dApp image URL.
   * @param categoryId - The category ID.
   * @param signer - The signer for the transaction.
   * @param overrides - Optional transaction overrides.
   * @param customProvider - Optional provider to override the default.
   * @returns A promise resolving to the transaction response.
   * @throws Error if inputs are invalid or the transaction fails.
   */
  public async updateDapp(
    dappId: string,
    name: string,
    description: string,
    url: string,
    imageURL: string,
    categoryId: number,
    signer: ethers.Signer,
    overrides?: ethers.Overrides,
    customProvider?: ethers.JsonRpcProvider
  ): Promise<ethers.ContractTransactionResponse> {
    await this.ensureInitialized();
    if (!dappId) throw new Error('dappId must be non-empty');
    if (!name || name.length > 100) throw new Error('Name must be non-empty and at most 100 characters');
    if (!description || description.length > 1000) throw new Error('Description must be non-empty and at most 1000 characters');
    if (!url || !/^https?:\/\//.test(url)) throw new Error('URL must be a valid HTTP/HTTPS URL');
    if (!imageURL || !/^https?:\/\//.test(imageURL)) throw new Error('Image URL must be a valid HTTP/HTTPS URL');
    if (!this.getAllCategories().some(cat => cat.id === categoryId)) throw new Error(`Invalid category ID: ${categoryId}`);

    try {
      const provider = customProvider || this.provider;
      const signerAddress = await signer.getAddress();
      this.logger.info(`Updating dapp with ID: ${dappId} from address: ${signerAddress}`);

      const contract = new Contract(this.chainConfig.contractAddress, CONTRACT_ABI, provider);
      const signedContract = contract.connect(signer) as Contract;
      const dappIdBytes32 = ethers.isHexString(dappId) && dappId.length === 66
        ? dappId
        : ethers.keccak256(ethers.toUtf8Bytes(dappId));

      this.logger.debug(`Using dappId (bytes32): ${dappIdBytes32}`);

      const tx = await signedContract.updateDapp(
        dappIdBytes32,
        name,
        description,
        url,
        imageURL,
        categoryId,
        overrides
      );

      this.logger.info(`Dapp update transaction sent: ${tx.hash}`);
      this.logger.debug(`Transaction details: gas limit ${tx.gasLimit}, nonce: ${tx.nonce}, overrides: ${JSON.stringify(overrides || {})}`);
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

  /**
   * Deletes a dApp.
   * @param dappId - The dApp ID.
   * @param signer - The signer for the transaction.
   * @param overrides - Optional transaction overrides.
   * @param customProvider - Optional provider to override the default.
   * @returns A promise resolving to the transaction response.
   * @throws Error if inputs are invalid or the transaction fails.
   */
  public async deleteDapp(
    dappId: string,
    signer: ethers.Signer,
    overrides?: ethers.Overrides,
    customProvider?: ethers.JsonRpcProvider
  ): Promise<ethers.ContractTransactionResponse> {
    await this.ensureInitialized();
    if (!dappId) throw new Error('dappId must be non-empty');

    try {
      const provider = customProvider || this.provider;
      const signerAddress = await signer.getAddress();
      this.logger.info(`Deleting dapp with ID: ${dappId} from address: ${signerAddress}`);

      const contract = new Contract(this.chainConfig.contractAddress, CONTRACT_ABI, provider);
      const signedContract = contract.connect(signer) as Contract;
      const dappIdBytes32 = ethers.isHexString(dappId) && dappId.length === 66
        ? dappId
        : ethers.keccak256(ethers.toUtf8Bytes(dappId));

      this.logger.debug(`Using dappId (bytes32): ${dappIdBytes32}`);
      const tx = await signedContract.deleteDapp(dappIdBytes32, overrides);

      this.logger.info(`Dapp deletion transaction sent: ${tx.hash}`);
      this.logger.debug(`Transaction details: gas limit ${tx.gasLimit}, nonce: ${tx.nonce}, overrides: ${JSON.stringify(overrides || {})}`);
      return tx;
    } catch (error: any) {
      this.logger.error('Error deleting dapp:', {
        dappId,
        error: error.message || error
      });
      throw new Error(`Failed to delete dapp: ${error.message || error}`);
    }
  }

  /**
   * Fetches all registered dApps.
   * @param includeRatings - Whether to include ratings data.
   * @param customProvider - Optional provider to override the default.
   * @returns An array of dApp information.
   * @throws Error if fetching dApps fails.
   */
  public async getAllDapps(
    includeRatings: boolean = true,
    customProvider?: ethers.JsonRpcProvider
  ): Promise<SDKDappRegisteredType[]> {
    await this.ensureInitialized();
    this.logger.debug(`Fetching all dapps (with ratings: ${includeRatings})`);

    try {
      const startTime = performance.now();
      const provider = customProvider || this.provider;
      const contract = new Contract(this.chainConfig.contractAddress, CONTRACT_ABI, provider);
      const dapps = await contract.getAllDapps();
      this.logger.debug(`Retrieved ${dapps.length} dapps from contract`);

      const transformedDapps: SDKDappRegisteredType[] = dapps.map((dapp: any) => {
        const category = this.getCategoryNameById(dapp.categoryId);
        return {
          dappId: dapp.dappId,
          name: dapp.name,
          description: dapp.description,
          url: dapp.url,
          imageUrl: dapp.imageUrl,
          categoryId: dapp.categoryId,
          category,
          owner: dapp.owner
        };
      });

      if (!includeRatings) {
        return transformedDapps;
      }

      const query = `
        query {
          dappRatingSubmitteds {
            dappId
            starRating
          }
        }
      `;
      const response = await this.fetchGraphQL<{ dappRatingSubmitteds: { dappId: string; starRating: number }[] }>({
        endpoint: this.getGraphqlUrl(),
        query
      });

      const reviews = response.data.dappRatingSubmitteds || [];
      const dappsWithRatings = transformedDapps.map(dapp => {
        const dappReviews = reviews.filter(r => r.dappId === dapp.dappId);
        const totalReviews = dappReviews.length;
        const averageRating = totalReviews > 0
          ? dappReviews.reduce((sum, r) => sum + r.starRating, 0) / totalReviews
          : 0;

        return {
          ...dapp,
          averageRating,
          totalReviews
        };
      });

      const endTime = performance.now();
      this.logger.debug(`Processed dapp data in ${(endTime - startTime).toFixed(2)}ms`);
      return dappsWithRatings;
    } catch (error) {
      this.logger.error('Failed to fetch dapps:', error);
      throw new Error(`Failed to fetch dapps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetches information for a specific dApp.
   * @param dappId - The dApp ID.
   * @param includeRatings - Whether to include ratings data.
   * @param customProvider - Optional provider to override the default.
   * @returns The dApp information or null if not found.
   * @throws Error if fetching the dApp fails.
   */
  public async getDapp(
    dappId: string,
    includeRatings: boolean = true,
    customProvider?: ethers.JsonRpcProvider
  ): Promise<SDKDappRegisteredType> {
    await this.ensureInitialized();
    if (!dappId) throw new Error('dappId must be non-empty');

    try {
      const provider = customProvider || this.provider;
      const contract = new Contract(this.chainConfig.contractAddress, CONTRACT_ABI, provider);
      const dappIdBytes32 = ethers.isHexString(dappId) && dappId.length === 66
        ? dappId
        : ethers.keccak256(ethers.toUtf8Bytes(dappId));

      this.logger.debug(`Fetching dapp with ID: ${dappId} (with ratings: ${includeRatings})`);
      const dapp = await contract.getDapp(dappIdBytes32);

      const category = this.getCategoryNameById(dapp.categoryId);
      const transformedDapp: SDKDappRegisteredType = {
        dappId: dapp.dappId,
        name: dapp.name,
        description: dapp.description,
        url: dapp.url,
        imageUrl: dapp.imageUrl,
        categoryId: dapp.categoryId,
        category,
        owner: dapp.owner
      };

      if (!includeRatings) {
        return transformedDapp;
      }

      this.logger.debug(`Fetching ratings for dapp ID: ${dappId}`);
      const ratings = await this.getProjectReviews(dappId);
      const totalReviews = ratings.length;
      const averageRating = totalReviews > 0
        ? ratings.reduce((sum, r) => sum + Number(r.starRating), 0) / totalReviews
        : 0;

      return {
        ...transformedDapp,
        averageRating,
        totalReviews
      };
    } catch (error: any) {
      if (error.message?.includes("Dapp not registered")) {
        this.logger.debug(`Dapp with ID ${dappId} not found`);
        throw new Error(`Dapp not found: ${dappId}`);
      }
      this.logger.error(`Failed to fetch dapp with ID ${dappId}:`, error);
      throw new Error(`Failed to fetch dapp: ${error.message || error}`);
    }
  }

  /**
   * Checks if a dApp is registered.
   * @param dappId - The dApp ID.
   * @param customProvider - Optional provider to override the default.
   * @returns True if the dApp is registered, false otherwise.
   * @throws Error if the query fails.
   */
  public async isDappRegistered(
    dappId: string,
    customProvider?: ethers.JsonRpcProvider
  ): Promise<boolean> {
    await this.ensureInitialized();
    if (!dappId) throw new Error('dappId must be non-empty');

    try {
      const provider = customProvider || this.provider;
      const contract = new Contract(this.chainConfig.contractAddress, CONTRACT_ABI, provider);
      const dappIdBytes32 = ethers.isHexString(dappId) && dappId.length === 66
        ? dappId
        : ethers.keccak256(ethers.toUtf8Bytes(dappId));

      this.logger.debug(`Checking if dapp is registered with ID: ${dappId}`);
      const isRegistered = await contract.isDappRegistered(dappIdBytes32);

      this.logger.debug(`Dapp ${dappId} is ${isRegistered ? '' : 'not '}registered`);
      return isRegistered;
    } catch (error) {
      this.logger.error(`Error checking if dapp is registered:`, {
        dappId,
        error
      });
      throw new Error(`Failed to check dapp registration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetches all reviews.
   * @returns An array of all reviews.
   * @throws Error if fetching reviews fails.
   */
  public async getAllReviews(): Promise<SDKDappReviewType[]> {
    await this.ensureInitialized();
    this.logger.debug('Fetching all reviews');

    try {
      const query = `
        query {
          dappRatingSubmitteds {
            id
            attestationId
            dappId
            starRating
            reviewText
            rater
          }
        }
      `;
      const response = await this.fetchGraphQL<{ dappRatingSubmitteds: SDKDappReviewType[] }>({
        endpoint: this.getGraphqlUrl(),
        query
      });

      const reviews = response.data.dappRatingSubmitteds || [];
      this.logger.debug(`Retrieved ${reviews.length} total reviews`);
      return reviews;
    } catch (error) {
      this.logger.error('Failed to fetch all reviews:', error);
      throw new Error(`Failed to fetch reviews: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sets the logging level.
   * @param level - The log level (e.g., 'info', 'debug').
   */
  public setLogLevel(level: LogLevel): void {
    this.logger.setLevel(level);
    this.logger.debug(`Log level set to: ${level}`);
  }

  /**
   * Gets the current logging level.
   * @returns The current log level.
   */
  public getLogLevel(): LogLevel {
    return this.logger.getLevel();
  }

  /**
   * Returns a structured category tree for frontend display.
   * @returns An array of main categories with their subcategories.
   */
  public getCategoryTree(): Array<{
    id: number;
    name: string;
    subcategories: Array<{ id: number; name: string }>
  }> {
    const mainCategories = getAllMainCategories();
    return mainCategories.map(mainCategory => {
      const subcategories = getCategoriesByMainCategory(mainCategory.id)
        .filter(category => category.id !== mainCategory.id)
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        id: mainCategory.id,
        name: mainCategory.name,
        subcategories
      };
    });
  }

  /**
   * Returns a flat list of all categories for simple selection UIs.
   * @returns An array of all category objects with id, name, and group.
   */
  public getAllCategories(): Array<{ id: number; name: string; group: string }> {
    return Object.entries(CATEGORY_NAMES).map(([idStr, catNameValue]) => {
      const id = Number(idStr);
      const mainCategoryId = Math.floor(id / 100) * 100;
      const groupValue = CATEGORY_NAMES[mainCategoryId] || "Other";

      // Ensure catNameValue and groupValue are strings
      const name = String(catNameValue);
      const group = String(groupValue);

      return { id, name, group };
    }).sort((a, b) => {
      const groupCompare = a.group.localeCompare(b.group);
      if (groupCompare !== 0) return groupCompare;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Returns a list of category options for dropdown or select inputs.
   * @returns An array of options with value, label, and group.
   */
  public getCategoryOptions(): CategoryOption[] {
    return this.getAllCategories()
      .filter(category => category.id % 100 !== 0)
      .map(category => ({
        value: category.id,
        label: category.name,
        group: category.group
      }));
  }

  public getCategoryNameById(categoryId: number): string {
    const allCategories = this.getAllCategories();
    const category = allCategories.find(cat => cat.id === categoryId);
    if (category) return `${category.name} (${category.group})`;
    const categoryName = CATEGORY_NAMES[categoryId];
    if (categoryName) return String(categoryName); // Ensure string
    return `Unknown (${categoryId})`;
  }
}

export * from './types';
