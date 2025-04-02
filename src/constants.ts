import { ChainInfo } from "./types";

// Default contract addresses for public networks
const DEFAULT_ADDRESSES = {
  POLYGON: '0xC876B28B3CD093402Ed73D85E3d21752a7D30A76',
  POLYGON_AMOY: '0x9500e6B9CdC0a934abD7Ed496Bf10AC0B1363CDA'
};

const DEFAULT_SUBGRAPH_URLS = {
  POLYGON: 'https://subgraph.satsuma-prod.com/8913ac6ee1bc/alexanders-team--782474/pol_mainnet/api',
  POLYGON_AMOY: 'https://subgraph.satsuma-prod.com/8913ac6ee1bc/alexanders-team--782474/pol_amoy/version/0.0.3/api'
};

// Chain configurations
export const CHAIN_CONFIGS: Record<number, ChainInfo> = {
  137: {
    chainId: 137,
    name: 'Polygon',
    graphqlUrl: DEFAULT_SUBGRAPH_URLS.POLYGON,
    contractAddress: DEFAULT_ADDRESSES.POLYGON,
    explorer: 'https://polygonscan.com'
  },
  80002: {
    chainId: 80002,
    name: "Polygon Amoy",
    graphqlUrl: DEFAULT_SUBGRAPH_URLS.POLYGON_AMOY,
    contractAddress: DEFAULT_ADDRESSES.POLYGON_AMOY,
    explorer: "https://amoy.polygonscan.com/"
  }
};
  
  export const CONTRACT_ABI = [
    {
      "inputs": [
        {
          "internalType": "contract IEAS",
          "name": "eas",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "schema",
          "type": "bytes32"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "InsufficientFee",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidDappId",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidEAS",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidRatingUID",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidSchemaUID",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidStarRating",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotDappOwner",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "dappId",
          "type": "bytes32"
        }
      ],
      "name": "DappDeleted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "ratingUid",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "revokedBy",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "revokedAt",
          "type": "uint256"
        }
      ],
      "name": "DappRatingRevoked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "rater",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "attestationId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "dappId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "starRating",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "reviewText",
          "type": "string"
        }
      ],
      "name": "DappRatingSubmitted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "dappId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "url",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "imageURL",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint16",
          "name": "categoryId",
          "type": "uint16"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "registrationTime",
          "type": "uint256"
        }
      ],
      "name": "DappRegistered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "dappId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "url",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "imageURL",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint16",
          "name": "categoryId",
          "type": "uint16"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "DappUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "FeesWithdrawn",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newFee",
          "type": "uint256"
        }
      ],
      "name": "RatingFeeUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newFee",
          "type": "uint256"
        }
      ],
      "name": "RegistrationFeeUpdated",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "dappId",
          "type": "bytes32"
        },
        {
          "internalType": "uint8",
          "name": "starRating",
          "type": "uint8"
        },
        {
          "internalType": "string",
          "name": "reviewText",
          "type": "string"
        }
      ],
      "name": "addDappRating",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "dappCounter",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "dappIdIsRegistered",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "dappRatingFee",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "dappRatingsCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "dappRegistrationFee",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "dapps",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "dappId",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "url",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "imageUrl",
          "type": "string"
        },
        {
          "internalType": "uint16",
          "name": "categoryId",
          "type": "uint16"
        },
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_dappId",
          "type": "bytes32"
        }
      ],
      "name": "deleteDapp",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getAllDapps",
      "outputs": [
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "dappId",
              "type": "bytes32"
            },
            {
              "internalType": "string",
              "name": "name",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "description",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "url",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "imageUrl",
              "type": "string"
            },
            {
              "internalType": "uint16",
              "name": "categoryId",
              "type": "uint16"
            },
            {
              "internalType": "address",
              "name": "owner",
              "type": "address"
            }
          ],
          "internalType": "struct DappRatingSystem.Dapp[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "dappId",
          "type": "bytes32"
        }
      ],
      "name": "getDapp",
      "outputs": [
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "dappId",
              "type": "bytes32"
            },
            {
              "internalType": "string",
              "name": "name",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "description",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "url",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "imageUrl",
              "type": "string"
            },
            {
              "internalType": "uint16",
              "name": "categoryId",
              "type": "uint16"
            },
            {
              "internalType": "address",
              "name": "owner",
              "type": "address"
            }
          ],
          "internalType": "struct DappRatingSystem.Dapp",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "dappId",
          "type": "bytes32"
        }
      ],
      "name": "getDappRatingsCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "dappId",
          "type": "bytes32"
        }
      ],
      "name": "isDappRegistered",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_description",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_url",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_imageURL",
          "type": "string"
        },
        {
          "internalType": "uint16",
          "name": "_categoryId",
          "type": "uint16"
        }
      ],
      "name": "registerDapp",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "ratingUid",
          "type": "bytes32"
        }
      ],
      "name": "revokeDappRating",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "newFee",
          "type": "uint256"
        }
      ],
      "name": "setDappRatingFee",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "newFee",
          "type": "uint256"
        }
      ],
      "name": "setDappRegistrationFee",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalRatingsCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_dappId",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "_name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_description",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_url",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_imageURL",
          "type": "string"
        },
        {
          "internalType": "uint16",
          "name": "_categoryId",
          "type": "uint16"
        }
      ],
      "name": "updateDapp",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "withdrawFees",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "stateMutability": "payable",
      "type": "receive"
    }
  ];