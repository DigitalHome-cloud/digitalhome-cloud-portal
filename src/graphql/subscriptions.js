/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateUserProfile = /* GraphQL */ `
  subscription OnCreateUserProfile(
    $filter: ModelSubscriptionUserProfileFilterInput
  ) {
    onCreateUserProfile(filter: $filter) {
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
export const onUpdateUserProfile = /* GraphQL */ `
  subscription OnUpdateUserProfile(
    $filter: ModelSubscriptionUserProfileFilterInput
  ) {
    onUpdateUserProfile(filter: $filter) {
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
export const onDeleteUserProfile = /* GraphQL */ `
  subscription OnDeleteUserProfile(
    $filter: ModelSubscriptionUserProfileFilterInput
  ) {
    onDeleteUserProfile(filter: $filter) {
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
export const onCreateLibraryItem = /* GraphQL */ `
  subscription OnCreateLibraryItem(
    $filter: ModelSubscriptionLibraryItemFilterInput
  ) {
    onCreateLibraryItem(filter: $filter) {
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
export const onUpdateLibraryItem = /* GraphQL */ `
  subscription OnUpdateLibraryItem(
    $filter: ModelSubscriptionLibraryItemFilterInput
  ) {
    onUpdateLibraryItem(filter: $filter) {
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
export const onDeleteLibraryItem = /* GraphQL */ `
  subscription OnDeleteLibraryItem(
    $filter: ModelSubscriptionLibraryItemFilterInput
  ) {
    onDeleteLibraryItem(filter: $filter) {
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
