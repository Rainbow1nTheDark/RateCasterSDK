import { ethers } from 'ethers';
import { RateCaster } from '../../src';
import dotenv from 'dotenv';

dotenv.config();

// Test data
const TEST_DAPP = {
  name: 'Test Dapp',
  description: 'Integration Test Dapp',
  url: 'https://test.com',
  imageUrl: 'https://test.com/image.png',
  platform: 'Polygon',
  category: 'Testing'
};

const TEST_REVIEW = {
  dappId: 'test-dapp',
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

  beforeAll(async () => {
    // Only run if integration tests are enabled
    if (!process.env.RUN_INTEGRATION_TESTS) {
      console.log('Skipping integration tests');
      return;
    }

    provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    signer = await provider.getSigner();
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
    });

    it('should submit a review', async () => {
      // Skip if integration tests are disabled
      if (!process.env.RUN_INTEGRATION_TESTS) {
        return;
      }

      const tx = await sdk.submitReview(
        TEST_REVIEW.dappId,
        TEST_REVIEW.rating,
        TEST_REVIEW.comment,
        signer
      );

      // Wait for transaction to be mined
      await provider.waitForTransaction(tx.hash);
      
      // Verify the review was submitted
      const reviews = await sdk.getProjectReviews(TEST_REVIEW.dappId);
      expect(reviews.length).toBeGreaterThan(0);
    });

    it('should fetch the dapp with its rating', async () => {
      const dapp = await sdk.getDapp(TEST_REVIEW.dappId);
      expect(dapp).toBeTruthy();
      expect(dapp?.averageRating).toBe(TEST_REVIEW.rating);
      expect(dapp?.totalReviews).toBe(1);
    });

    // Cleanup
    afterAll(async () => {
      if (TEST_REVIEW.dappId) {
        const tx = await sdk.deleteDapp(TEST_REVIEW.dappId, signer);
        await tx.wait();
      }
    });
  });
}); 