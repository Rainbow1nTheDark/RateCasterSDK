export const GET_PROJECT_REVIEWS = `
  query GetProjectReviews($projectId: String!) {
    dappRatingSubmitteds(where: { dappId: $projectId }) {
      id
      attestationId
      dappId
      starRating
      reviewText
    }
  }
`;

export const GET_USER_REVIEWS = `
  query GetUserReviews($userAddress: String!) {
    dappRatingSubmitteds(where: { rater: $userAddress }) {
      id
      attestationId
      dappId
      starRating
      reviewText
    }
  }
`;

export const GET_ALL_DAPPS = `
  query GetAllDapps {
    dappRegistereds {
      dappId
      description
      name
      url
      platform
      category
    }
  }
`;