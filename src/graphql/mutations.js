/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createUserProfile = /* GraphQL */ `
  mutation CreateUserProfile(
    $input: CreateUserProfileInput!
    $condition: ModelUserProfileConditionInput
  ) {
    createUserProfile(input: $input, condition: $condition) {
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
export const updateUserProfile = /* GraphQL */ `
  mutation UpdateUserProfile(
    $input: UpdateUserProfileInput!
    $condition: ModelUserProfileConditionInput
  ) {
    updateUserProfile(input: $input, condition: $condition) {
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
export const deleteUserProfile = /* GraphQL */ `
  mutation DeleteUserProfile(
    $input: DeleteUserProfileInput!
    $condition: ModelUserProfileConditionInput
  ) {
    deleteUserProfile(input: $input, condition: $condition) {
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
export const createLibraryItem = /* GraphQL */ `
  mutation CreateLibraryItem(
    $input: CreateLibraryItemInput!
    $condition: ModelLibraryItemConditionInput
  ) {
    createLibraryItem(input: $input, condition: $condition) {
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
export const updateLibraryItem = /* GraphQL */ `
  mutation UpdateLibraryItem(
    $input: UpdateLibraryItemInput!
    $condition: ModelLibraryItemConditionInput
  ) {
    updateLibraryItem(input: $input, condition: $condition) {
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
export const deleteLibraryItem = /* GraphQL */ `
  mutation DeleteLibraryItem(
    $input: DeleteLibraryItemInput!
    $condition: ModelLibraryItemConditionInput
  ) {
    deleteLibraryItem(input: $input, condition: $condition) {
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
