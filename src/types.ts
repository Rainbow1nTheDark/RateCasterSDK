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
  rater: string;
  reviewText: string;
  timestamp?: number;
}

export interface DappRegistered {
  dappId: string;
  name: string;
  description: string;
  url: string;
  imageUrl: string;
  categoryId: number;
  category?: string;
  owner: string;
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


export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

export interface CategoryOption {
  value: number;
  label: string;
  group: string;
}

// Category System
export enum CategoryId {
  // B2B: 100-199
  B2B = 100,
  B2B_DECENTRALISED_STORAGE = 101,
  B2B_DECENTRALISED_COMPUTE = 102,
  B2B_AUTOMATION_BOTS = 103,
  B2B_ON_RAMP_OFF_RAMP = 104,
  B2B_DEV_TOOLS = 105,
  B2B_EXPLORER = 106,
  B2B_WALLET = 107,
  B2B_INFRASTRUCTURE = 108,
  B2B_OTHERS = 199,
  
  // Tools: 200-299
  TOOLS = 200,
  TOOLS_CEX = 201,
  
  // DApps: 300-399
  DAPPS = 300,
  DAPPS_DAO = 301,
  
  // DeFi: 400-499
  DEFI = 400,
  DEFI_BETTING = 401,
  DEFI_LENDING = 402,
  DEFI_PREDICTION_MARKET = 403,
  DEFI_STABLECOIN = 404,
  DEFI_YIELD_AGGREGATOR = 405,
  DEFI_SYNTHETICS = 406,
  DEFI_INSURANCE = 407,
  DEFI_RESERVE_CURRENCY = 408,
  DEFI_ORACLE = 409,
  DEFI_LOTTERY = 410,
  DEFI_STAKING = 411,
  DEFI_DEX = 412,
  DEFI_BRIDGE = 413,
  DEFI_YIELD = 414,
  DEFI_LAUNCHPAD = 415,
  DEFI_TOOLING = 416,
  DEFI_DERIVATIVES = 417,
  DEFI_PAYMENTS = 418,
  DEFI_INDEXES = 419,
  DEFI_PRIVACY = 420,
  
  // Social: 500-599
  SOCIAL = 500,
  SOCIAL_MESSAGING = 501,
  SOCIAL_NOTIFICATION = 502,
  SOCIAL_NETWORK = 503,
  SOCIAL_TOKEN = 504,
  
  // NFT: 600-699
  NFT = 600,
  NFT_GAME = 601,
  NFT_CREATOR_BRAND = 602,
  NFT_MIDDLEWARE = 603,
  NFT_PFP_GAME = 604,
  NFT_PFP_COLLECTIBLES = 605,
  NFT_MARKETPLACE = 606,
  
  // Gaming: 700-799
  GAMING = 700,
  GAMING_TRADING_CARD = 701,
  GAMING_SURVIVAL = 702,
  GAMING_STRATEGY = 703,
  GAMING_SIMULATION = 704,
  GAMING_SHOOTER = 705,
  GAMING_RPG = 706,
  GAMING_RHYTHM_ACTION = 707,
  GAMING_PLATFORMER = 708,
  GAMING_MMO = 709,
  GAMING_METAVERSE = 710,
  GAMING_FIGHTING = 711,
  GAMING_CCG = 712,
  GAMING_BATTLE_ROYALE = 713,
  GAMING_ADVENTURE = 714,
  GAMING_ARCADE = 715,
  GAMING_CARDS_BOARD = 716,
  GAMING_GAMBLING = 717,
  GAMING_CRYPTO_FARMING = 718,
  GAMING_PUZZLE_PARTY = 719,
  GAMING_RACING = 720,
  GAMING_SANDBOX = 721,
  GAMING_SPORTS = 722,
  GAMING_TOWER_DEFENCE = 723,
  GAMING_OTHERS = 799
}

// Map from CategoryId to human-readable names
export const CATEGORY_NAMES: Record<number, string> = {
  // B2B
  [CategoryId.B2B]: "B2B",
  [CategoryId.B2B_DECENTRALISED_STORAGE]: "Decentralised Storage",
  [CategoryId.B2B_DECENTRALISED_COMPUTE]: "Decentralised Compute",
  [CategoryId.B2B_AUTOMATION_BOTS]: "Automation/Bots",
  [CategoryId.B2B_ON_RAMP_OFF_RAMP]: "On Ramp/Off Ramp",
  [CategoryId.B2B_DEV_TOOLS]: "Dev Tools",
  [CategoryId.B2B_EXPLORER]: "Explorer",
  [CategoryId.B2B_WALLET]: "Wallet",
  [CategoryId.B2B_INFRASTRUCTURE]: "Infrastructure",
  [CategoryId.B2B_OTHERS]: "Others (B2B)",
  
  // Tools
  [CategoryId.TOOLS]: "Tools",
  [CategoryId.TOOLS_CEX]: "CEX",
  
  // DApps
  [CategoryId.DAPPS]: "DApps",
  [CategoryId.DAPPS_DAO]: "DAO",
  
  // DeFi
  [CategoryId.DEFI]: "DeFi",
  [CategoryId.DEFI_BETTING]: "Betting",
  [CategoryId.DEFI_LENDING]: "Lending",
  [CategoryId.DEFI_PREDICTION_MARKET]: "Prediction Market",
  [CategoryId.DEFI_STABLECOIN]: "Stablecoin",
  [CategoryId.DEFI_YIELD_AGGREGATOR]: "Yield Aggregator",
  [CategoryId.DEFI_SYNTHETICS]: "Synthetics",
  [CategoryId.DEFI_INSURANCE]: "Insurance",
  [CategoryId.DEFI_RESERVE_CURRENCY]: "Reserve Currency",
  [CategoryId.DEFI_ORACLE]: "Oracle",
  [CategoryId.DEFI_LOTTERY]: "Lottery",
  [CategoryId.DEFI_STAKING]: "Staking",
  [CategoryId.DEFI_DEX]: "DEX",
  [CategoryId.DEFI_BRIDGE]: "Bridge",
  [CategoryId.DEFI_YIELD]: "Yield",
  [CategoryId.DEFI_LAUNCHPAD]: "Launchpad",
  [CategoryId.DEFI_TOOLING]: "Tooling",
  [CategoryId.DEFI_DERIVATIVES]: "Derivatives",
  [CategoryId.DEFI_PAYMENTS]: "Payments",
  [CategoryId.DEFI_INDEXES]: "Indexes",
  [CategoryId.DEFI_PRIVACY]: "Privacy",
  
  // Social
  [CategoryId.SOCIAL]: "Social",
  [CategoryId.SOCIAL_MESSAGING]: "Messaging",
  [CategoryId.SOCIAL_NOTIFICATION]: "Notification",
  [CategoryId.SOCIAL_NETWORK]: "Social Network",
  [CategoryId.SOCIAL_TOKEN]: "Social Token",
  
  // NFT
  [CategoryId.NFT]: "NFT",
  [CategoryId.NFT_GAME]: "Game",
  [CategoryId.NFT_CREATOR_BRAND]: "Creator/Brand (Art/Music/Fashion)",
  [CategoryId.NFT_MIDDLEWARE]: "Middleware Offerings",
  [CategoryId.NFT_PFP_GAME]: "PFP+Game",
  [CategoryId.NFT_PFP_COLLECTIBLES]: "PFP Project/Collectibles",
  [CategoryId.NFT_MARKETPLACE]: "Marketplace",
  
  // Gaming
  [CategoryId.GAMING]: "Gaming",
  [CategoryId.GAMING_TRADING_CARD]: "Trading Card Game",
  [CategoryId.GAMING_SURVIVAL]: "Survival",
  [CategoryId.GAMING_STRATEGY]: "Strategy",
  [CategoryId.GAMING_SIMULATION]: "Simulation",
  [CategoryId.GAMING_SHOOTER]: "Shooter",
  [CategoryId.GAMING_RPG]: "RPG",
  [CategoryId.GAMING_RHYTHM_ACTION]: "Rhythm Action",
  [CategoryId.GAMING_PLATFORMER]: "Platformer",
  [CategoryId.GAMING_MMO]: "MMO",
  [CategoryId.GAMING_METAVERSE]: "Metaverse",
  [CategoryId.GAMING_FIGHTING]: "Fighting",
  [CategoryId.GAMING_CCG]: "CCG",
  [CategoryId.GAMING_BATTLE_ROYALE]: "Battle Royale",
  [CategoryId.GAMING_ADVENTURE]: "Adventure",
  [CategoryId.GAMING_ARCADE]: "Arcade",
  [CategoryId.GAMING_CARDS_BOARD]: "Cards/Board/Trading",
  [CategoryId.GAMING_GAMBLING]: "Gambling",
  [CategoryId.GAMING_CRYPTO_FARMING]: "Crypto Farming",
  [CategoryId.GAMING_PUZZLE_PARTY]: "Puzzle/Party Games",
  [CategoryId.GAMING_RACING]: "Racing",
  [CategoryId.GAMING_SANDBOX]: "Sandbox/Open World",
  [CategoryId.GAMING_SPORTS]: "Sports",
  [CategoryId.GAMING_TOWER_DEFENCE]: "Tower Defence",
  [CategoryId.GAMING_OTHERS]: "Others (Gaming)"
};

// Helper functions to work with categories
export const getCategoryName = (categoryId: number): string => {
  return CATEGORY_NAMES[categoryId] || "Unknown Category";
};

export const getMainCategoryId = (categoryId: number): number => {
  return Math.floor(categoryId / 100) * 100;
};

export const getMainCategoryName = (categoryId: number): string => {
  const mainCategoryId = getMainCategoryId(categoryId);
  return CATEGORY_NAMES[mainCategoryId] || "Unknown Category";
};

export const getCategoriesByMainCategory = (mainCategoryId: number): {id: number, name: string}[] => {
  return Object.entries(CATEGORY_NAMES)
    .filter(([id, _]) => Math.floor(Number(id) / 100) * 100 === mainCategoryId)
    .map(([id, name]) => ({id: Number(id), name}));
};

export const getAllMainCategories = (): {id: number, name: string}[] => {
  return [
    { id: CategoryId.B2B, name: CATEGORY_NAMES[CategoryId.B2B] },
    { id: CategoryId.TOOLS, name: CATEGORY_NAMES[CategoryId.TOOLS] },
    { id: CategoryId.DAPPS, name: CATEGORY_NAMES[CategoryId.DAPPS] },
    { id: CategoryId.DEFI, name: CATEGORY_NAMES[CategoryId.DEFI] },
    { id: CategoryId.SOCIAL, name: CATEGORY_NAMES[CategoryId.SOCIAL] },
    { id: CategoryId.NFT, name: CATEGORY_NAMES[CategoryId.NFT] },
    { id: CategoryId.GAMING, name: CATEGORY_NAMES[CategoryId.GAMING] }
  ];
};