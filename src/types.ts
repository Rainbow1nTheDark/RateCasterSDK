export type ChainName = 'Polygon' | 'Base' | 'Base Goerli';

export interface ChainInfo {
  chainId: number;
  name: ChainName;
  graphqlUrl: string;
  contractAddress: string;
  explorer: string;
}

export interface DappReview {
  attestationId: string;
  dappId: string;
  starRating: number;
  reviewText: string;
  timestamp: number;
}

export interface SDKConfig {
  contractAddress: string;
  customGraphqlUrls?: Partial<Record<ChainName, string>>;
}