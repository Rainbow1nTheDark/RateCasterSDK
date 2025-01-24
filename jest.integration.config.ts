import type { Config } from 'jest';
import baseConfig from './jest.config';

const config: Config = {
  ...baseConfig,
  testMatch: ['**/tests/integration/**/*.test.ts'],
  testTimeout: 30000, // Longer timeout for blockchain transactions
  setupFiles: ['<rootDir>/tests/integration/setup.ts']
};

export default config; 