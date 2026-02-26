/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getUserProfile = /* GraphQL */ `
  query GetUserProfile($id: ID!) {
    getUserProfile(id: $id) {
      id
      owner
      displayName
      email
      locale
      marketingOptIn
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listUserProfiles = /* GraphQL */ `
  query ListUserProfiles(
    $filter: ModelUserProfileFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listUserProfiles(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        owner
        displayName
        email
        locale
        marketingOptIn
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getLibraryItem = /* GraphQL */ `
  query GetLibraryItem($id: ID!) {
    getLibraryItem(id: $id) {
      id
      title
      compatibleClasses
      region
      standards
      version
      description
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listLibraryItems = /* GraphQL */ `
  query ListLibraryItems(
    $filter: ModelLibraryItemFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listLibraryItems(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        title
        compatibleClasses
        region
        standards
        version
        description
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
