import dotenv from 'dotenv';
import { ChainInfo, ChainName } from "./types";

// Load environment variables
dotenv.config();

if (!process.env.ALCHEMY_SUBGRAPH_KEY) {
  throw new Error('ALCHEMY_SUBGRAPH_KEY is not defined in environment variables');
}

const ALCHEMY_SUBGRAPH_KEY = process.env.ALCHEMY_SUBGRAPH_KEY;
const SUBGRAPH_BASE_URL = 'https://subgraph.satsuma-prod.com';

export const CHAIN_CONFIGS: Record<ChainName, ChainInfo> = {
  'Polygon': {
    chainId: 137,
    name: 'Polygon',
    graphqlUrl: `${SUBGRAPH_BASE_URL}/${ALCHEMY_SUBGRAPH_KEY}/alexanders-team--782474/ratecast-polygon/api`,
    contractAddress: process.env.POLYGON_CONTRACT_ADDRESS || '0x...',
    explorer: 'https://polygonscan.com'
  },
  'Base': {
    chainId: 8453,
    name: 'Base',
    graphqlUrl: `${SUBGRAPH_BASE_URL}/${ALCHEMY_SUBGRAPH_KEY}/alexanders-team--782474/ratecast-base/api`,
    contractAddress: process.env.BASE_CONTRACT_ADDRESS || '0x...',
    explorer: 'https://basescan.org'
  },
  'Base Goerli': {
    chainId: 84531,
    name: 'Base Goerli',
    graphqlUrl: `${SUBGRAPH_BASE_URL}/${ALCHEMY_SUBGRAPH_KEY}/alexanders-team--782474/ratecast-base-goerli/api`,
    contractAddress: process.env.BASE_GOERLI_CONTRACT_ADDRESS || '0x...',
    explorer: 'https://goerli.basescan.org'
  }
};
  
  export const CONTRACT_ABI = [
    // Constructor and Errors
    {
      inputs: [
        { internalType: "contract IEAS", name: "eas", type: "address" },
        { internalType: "bytes32", name: "schema", type: "bytes32" }
      ],
      stateMutability: "nonpayable",
      type: "constructor"
    },
    { inputs: [], name: "InvalidDappId", type: "error" },
    { inputs: [], name: "InvalidEAS", type: "error" },
    { inputs: [], name: "InvalidRatingUID", type: "error" },
    { inputs: [], name: "InvalidSchemaUID", type: "error" },
    { inputs: [], name: "InvalidStarRating", type: "error" },
    { inputs: [], name: "NotDappOwner", type: "error" },

    // Events
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: "bytes32", name: "dappId", type: "bytes32" }
      ],
      name: "DappDeleted",
      type: "event"
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: "bytes32", name: "ratingUid", type: "bytes32" },
        { indexed: true, internalType: "address", name: "revokedBy", type: "address" },
        { indexed: false, internalType: "uint256", name: "revokedAt", type: "uint256" }
      ],
      name: "DappRatingRevoked",
      type: "event"
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: "bytes32", name: "attestationId", type: "bytes32" },
        { indexed: true, internalType: "bytes32", name: "dappId", type: "bytes32" },
        { indexed: false, internalType: "uint8", name: "starRating", type: "uint8" },
        { indexed: false, internalType: "string", name: "reviewText", type: "string" }
      ],
      name: "DappRatingSubmitted",
      type: "event"
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: "bytes32", name: "dappId", type: "bytes32" },
        { indexed: false, internalType: "string", name: "name", type: "string" },
        { indexed: false, internalType: "string", name: "description", type: "string" },
        { indexed: false, internalType: "string", name: "url", type: "string" },
        { indexed: false, internalType: "string", name: "imageURL", type: "string" },
        { indexed: false, internalType: "string", name: "platform", type: "string" },
        { indexed: false, internalType: "string", name: "category", type: "string" },
        { indexed: false, internalType: "address", name: "owner", type: "address" },
        { indexed: false, internalType: "uint256", name: "registrationTime", type: "uint256" }
      ],
      name: "DappRegistered",
      type: "event"
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: "bytes32", name: "dappId", type: "bytes32" },
        { indexed: false, internalType: "string", name: "name", type: "string" },
        { indexed: false, internalType: "string", name: "description", type: "string" },
        { indexed: false, internalType: "string", name: "url", type: "string" },
        { indexed: false, internalType: "string", name: "imageURL", type: "string" },
        { indexed: false, internalType: "string", name: "platform", type: "string" },
        { indexed: false, internalType: "string", name: "category", type: "string" },
        { indexed: false, internalType: "address", name: "owner", type: "address" }
      ],
      name: "DappUpdated",
      type: "event"
    },

    // Functions
    {
      inputs: [
        { internalType: "bytes32", name: "dappId", type: "bytes32" },
        { internalType: "uint8", name: "starRating", type: "uint8" },
        { internalType: "string", name: "reviewText", type: "string" }
      ],
      name: "addDappRating",
      outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [],
      name: "dappCounter",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
      name: "dappIdIsRegistered",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [{ internalType: "bytes32", name: "_dappId", type: "bytes32" }],
      name: "deleteDapp",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [],
      name: "getAllDapps",
      outputs: [{
        components: [
          { internalType: "bytes32", name: "dappId", type: "bytes32" },
          { internalType: "string", name: "name", type: "string" },
          { internalType: "string", name: "description", type: "string" },
          { internalType: "string", name: "url", type: "string" },
          { internalType: "string", name: "imageUrl", type: "string" },
          { internalType: "string", name: "platform", type: "string" },
          { internalType: "string", name: "category", type: "string" },
          { internalType: "address", name: "owner", type: "address" }
        ],
        internalType: "struct DappRatingSystem.Dapp[]",
        name: "",
        type: "tuple[]"
      }],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [{ internalType: "bytes32", name: "dappId", type: "bytes32" }],
      name: "getDapp",
      outputs: [{
        components: [
          { internalType: "bytes32", name: "dappId", type: "bytes32" },
          { internalType: "string", name: "name", type: "string" },
          { internalType: "string", name: "description", type: "string" },
          { internalType: "string", name: "url", type: "string" },
          { internalType: "string", name: "imageUrl", type: "string" },
          { internalType: "string", name: "platform", type: "string" },
          { internalType: "string", name: "category", type: "string" },
          { internalType: "address", name: "owner", type: "address" }
        ],
        internalType: "struct DappRatingSystem.Dapp",
        name: "",
        type: "tuple"
      }],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [{ internalType: "bytes32", name: "dappId", type: "bytes32" }],
      name: "isDappRegistered",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [
        { internalType: "string", name: "_name", type: "string" },
        { internalType: "string", name: "_description", type: "string" },
        { internalType: "string", name: "_url", type: "string" },
        { internalType: "string", name: "_imageURL", type: "string" },
        { internalType: "string", name: "_platform", type: "string" },
        { internalType: "string", name: "_category", type: "string" }
      ],
      name: "registerDapp",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [{ internalType: "bytes32", name: "ratingUid", type: "bytes32" }],
      name: "revokeDappRating",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        { internalType: "bytes32", name: "_dappId", type: "bytes32" },
        { internalType: "string", name: "_name", type: "string" },
        { internalType: "string", name: "_description", type: "string" },
        { internalType: "string", name: "_url", type: "string" },
        { internalType: "string", name: "_imageURL", type: "string" },
        { internalType: "string", name: "_platform", type: "string" },
        { internalType: "string", name: "_category", type: "string" }
      ],
      name: "updateDapp",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    }
  ];
  