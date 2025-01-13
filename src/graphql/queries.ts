export const GET_PROJECT_REVIEWS = `
  query GetProjectReviews($projectId: String!) {
    reviewSubmitteds(where: { projectId: $projectId }) {
      projectId
      raterAddress
      starRating
      reviewText
      timestamp
    }
  }
`;

export const GET_USER_REVIEWS = `
  query GetUserReviews($userAddress: String!) {
    reviewSubmitteds(where: { raterAddress: $userAddress }) {
      projectId
      raterAddress
      starRating
      reviewText
      timestamp
    }
  }
`;