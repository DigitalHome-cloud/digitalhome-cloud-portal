// Environment-driven aws-exports for DigitalHome.Cloud portal.
// This file deliberately does NOT contain any hard-coded IDs.
// All values are read from process.env.GATSBY_* so that:
//  - GitHub never stores backend identifiers
//  - Amplify Gen2 can inject different values per branch/env
//
// Make sure to define these env vars for local dev and in Amplify:
//   GATSBY_AWS_REGION
//   GATSBY_USER_POOL_ID
//   GATSBY_USER_POOL_CLIENT_ID
//   GATSBY_IDENTITY_POOL_ID          (optional, only if you use it)
//   GATSBY_APPSYNC_ENDPOINT          (optional, if using AppSync)
//   GATSBY_APPSYNC_AUTH_TYPE         (defaults to AMAZON_COGNITO_USER_POOLS)
//
// In Gatsby, any env var starting with GATSBY_ will be embedded in the bundle.

const awsmobile = {
  aws_project_region: process.env.GATSBY_AWS_REGION,
  aws_cognito_region: process.env.GATSBY_AWS_REGION,

  // Cognito User Pools (Auth)
  aws_user_pools_id: process.env.GATSBY_USER_POOL_ID,
  aws_user_pools_web_client_id: process.env.GATSBY_USER_POOL_CLIENT_ID,

  // (Optional) Cognito Identity Pool for federated identities
  aws_cognito_identity_pool_id: process.env.GATSBY_IDENTITY_POOL_ID,

  // (Optional) AppSync / GraphQL API
  aws_appsync_graphqlEndpoint: process.env.GATSBY_APPSYNC_ENDPOINT,
  aws_appsync_region: process.env.GATSBY_AWS_REGION,
  aws_appsync_authenticationType:
    process.env.GATSBY_APPSYNC_AUTH_TYPE || "AMAZON_COGNITO_USER_POOLS",
};

export default awsmobile;
