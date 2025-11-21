// Environment-driven aws-exports for DigitalHome.Cloud portal.
// No hard-coded IDs or secrets – everything comes from env vars.
//
// Expected env vars (local + Amplify build env):
//   GATSBY_AWS_REGION
//   GATSBY_USER_POOL_ID
//   GATSBY_USER_POOL_CLIENT_ID
//   GATSBY_IDENTITY_POOL_ID              (optional)
//   GATSBY_APPSYNC_ENDPOINT              (optional)
//   GATSBY_APPSYNC_AUTH_TYPE             (defaults to AMAZON_COGNITO_USER_POOLS)
//   GATSBY_COGNITO_OAUTH_DOMAIN          (for hosted UI + social login)
//   GATSBY_COGNITO_OAUTH_REDIRECT_SIGNIN (comma-separated for local+prod)
//   GATSBY_COGNITO_OAUTH_REDIRECT_SIGNOUT(comma-separated for local+prod)
//   GATSBY_COGNITO_OAUTH_SCOPES          (comma-separated, default common scopes)
//   GATSBY_COGNITO_OAUTH_RESPONSETYPE    (default: code)
//   GATSBY_COGNITO_SOCIAL_PROVIDERS      (comma-separated, e.g. GOOGLE,FACEBOOK)
//
// In Gatsby, any env var starting with GATSBY_ will be embedded in the bundle.

const getScopes = () => {
  const raw = process.env.GATSBY_COGNITO_OAUTH_SCOPES;
  if (!raw) {
    return ["phone", "email", "openid", "profile", "aws.cognito.signin.user.admin"];
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const getSocialProviders = () => {
  const raw = process.env.GATSBY_COGNITO_SOCIAL_PROVIDERS;
  if (!raw) {
    return ["GOOGLE"];
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

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

  // Hosted UI + Social providers (e.g. Google)
  oauth: {
    domain: process.env.GATSBY_COGNITO_OAUTH_DOMAIN,
    scope: getScopes(),
    redirectSignIn: process.env.GATSBY_COGNITO_OAUTH_REDIRECT_SIGNIN,
    redirectSignOut: process.env.GATSBY_COGNITO_OAUTH_REDIRECT_SIGNOUT,
    responseType: process.env.GATSBY_COGNITO_OAUTH_RESPONSETYPE || "code",
  },

  federationTarget: "COGNITO_USER_POOLS",
  aws_cognito_social_providers: getSocialProviders(),
};

export default awsmobile;


