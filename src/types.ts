export interface ChainInfo {
  chainId: number;
  name: String;
  graphqlUrl: string;
  contractAddress: string;
  explorer: string;
}

export interface DappReview {
  id: string;
  attestationId: string;
  dappId: string;
  starRating: number;
  reviewText: string;
}

export interface DappRegistered {
  dappId: string;
  description: string;
  name: string;
  url: string;
  category: string;
  imageUrl: string;
  owner: string
  averageRating?: number;
  totalReviews?: number;
}

export interface GraphQLRequestConfig {
  endpoint: string;
  query: string;
}

export interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

export interface DappRating {
  id: string;
  attestationId: string;
  dappId: string;
  starRating: number;
  reviewText: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';