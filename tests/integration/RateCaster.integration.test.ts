import { ethers } from 'ethers';
import { RateCaster } from '../../src';
import dotenv from 'dotenv';

dotenv.config();

// Test data
const TEST_DAPP = {
  name: 'Planetix',
  description: 'Gaming platform for the next generation',
  url: 'https://planetix3.com/',
  imageUrl: 'https://planetix.com/static/media/planetix-logo.png',
  platform: 'Polygon',
  category: 'Gaming'
};

const TEST_REVIEW = {
  dappId: ethers.keccak256(ethers.toUtf8Bytes(TEST_DAPP.url)),
  rating: 5,
  comment: 'Great integration test dapp!'
};

// Only run these tests if INTEGRATION_TESTS is enabled
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

// Skip all tests if integration tests are disabled
(runIntegrationTests ? describe : describe.skip)('RateCaster Integration Tests', () => {
  let sdk: RateCaster;
  let provider: ethers.JsonRpcProvider;
  let signer: ethers.Signer;

  // Set timeout for all tests in this suite
  jest.setTimeout(1000000);

  beforeAll(async () => {
    if (!process.env.RUN_INTEGRATION_TESTS) {
      console.log('Skipping integration tests');
      return;
    }

    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY environment variable is required for integration tests');
    }

    provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    sdk = new RateCaster(provider);
  });

  describe('End-to-End Flow', () => {
    let dappId: string;

    it('should register a new dapp', async () => {
      const tx = await sdk.registerDapp(
        TEST_DAPP.name,
        TEST_DAPP.description,
        TEST_DAPP.url,
        TEST_DAPP.imageUrl,
        TEST_DAPP.platform,
        TEST_DAPP.category,
        signer
      );
      
      const receipt = await tx.wait();
      expect(receipt?.status).toBe(1);
    }, 1000000);

    it('should submit a review', async () => {
      const tx = await sdk.submitReview(
        TEST_REVIEW.dappId,
        TEST_REVIEW.rating,
        TEST_REVIEW.comment,
        signer
      );

      await provider.waitForTransaction(tx.hash);
      
      const reviews = await sdk.getProjectReviews(TEST_REVIEW.dappId);
      expect(reviews.length).toBeGreaterThan(0);
    }, 1000000);

    it('should fetch the dapp with its rating', async () => {
      const dapp = await sdk.getDapp(TEST_REVIEW.dappId);
      expect(dapp).toBeTruthy();
      expect(dapp?.averageRating).toBe(TEST_REVIEW.rating);
      expect(dapp?.totalReviews).toBe(1);
    }, 1000000);

    // // Cleanup
    // afterAll(async () => {
    //   if (TEST_REVIEW.dappId) {
    //     const tx = await sdk.deleteDapp(TEST_REVIEW.dappId, signer);
    //     await tx.wait();
    //   }
    // });
  });
}); 