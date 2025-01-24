import dotenv from 'dotenv';

// Load environment variables for tests
dotenv.config({ path: '.env.test' });

// Mock environment variables if they don't exist
process.env.ALCHEMY_SUBGRAPH_KEY = process.env.ALCHEMY_SUBGRAPH_KEY || 'test-key';
process.env.POLYGON_CONTRACT_ADDRESS = process.env.POLYGON_CONTRACT_ADDRESS || '0x1234';
process.env.BASE_CONTRACT_ADDRESS = process.env.BASE_CONTRACT_ADDRESS || '0x5678';