// Backend persistence for the active-home selection, shared across apps via
// UserProfile.activeSmartHomeId. Inline GraphQL because the generated
// UserProfile ops predate the activeSmartHomeId field (so their selection sets
// don't include it). Owner-auth means each user reads/writes only their row.

import { generateClient } from "aws-amplify/api";

const LIST_MY_PROFILE = /* GraphQL */ `
  query ListMyProfile($filter: ModelUserProfileFilterInput, $nextToken: String) {
    listUserProfiles(filter: $filter, nextToken: $nextToken) {
      items { id activeSmartHomeId updatedAt }
      nextToken
    }
  }
`;

// The caller's own profile rows. Amplify stores the owner as "<sub>::<username>",
// so a filter on the bare username never matches; and DynamoDB applies a limit
// BEFORE the filter, so "limit: 1" reads one row of the whole table. Both made
// the lookup come back empty and every home selection create another profile.
// The filter stays: an administrator may read every profile. Pages are read to
// the end, and the newest row wins (older duplicates are left as they are).
export const ownerFilter = (user) => {
  const sub = user?.userId || user?.idTokenPayload?.sub || user?.username;
  return sub ? { owner: { beginsWith: `${sub}::` } } : null;
};

export async function findOwnProfile(client, query, user, field = "listUserProfiles") {
  const filter = ownerFilter(user);
  if (!filter) return null;
  let newest = null;
  let nextToken = null;
  do {
    const res = await client.graphql({ query, variables: { filter, nextToken }, authMode: "userPool" });
    const page = res?.data?.[field] || {};
    for (const p of page.items || []) {
      if (p && (!newest || String(p.updatedAt || "") > String(newest.updatedAt || ""))) newest = p;
    }
    nextToken = page.nextToken || null;
  } while (nextToken);
  return newest;
}

const UPDATE_ACTIVE_HOME = /* GraphQL */ `
  mutation UpdateActiveHome($id: ID!, $activeSmartHomeId: String) {
    updateUserProfile(input: { id: $id, activeSmartHomeId: $activeSmartHomeId }) {
      id
      activeSmartHomeId
    }
  }
`;

const CREATE_ACTIVE_HOME = /* GraphQL */ `
  mutation CreateActiveHome($activeSmartHomeId: String) {
    createUserProfile(input: { activeSmartHomeId: $activeSmartHomeId }) {
      id
      activeSmartHomeId
    }
  }
`;

// Read the caller's persisted selection. Returns { profileId, activeSmartHomeId }
// or null (no profile row / not signed in / error).
export async function fetchProfileActiveHome(user) {
  if (!ownerFilter(user)) return null;
  try {
    const item = await findOwnProfile(generateClient(), LIST_MY_PROFILE, user);
    return item
      ? { profileId: item.id, activeSmartHomeId: item.activeSmartHomeId || null }
      : null;
  } catch (err) {
    console.warn("[activeHome] fetch failed:", err);
    return null;
  }
}

// Persist the selection; creates the profile row if the user has none yet.
// Fire-and-forget — never throws into the UI. Returns the (possibly new) id.
export async function persistActiveHome(profileId, id) {
  try {
    const client = generateClient();
    if (profileId) {
      await client.graphql({
        query: UPDATE_ACTIVE_HOME,
        variables: { id: profileId, activeSmartHomeId: id || null },
        authMode: "userPool",
      });
      return profileId;
    }
    const res = await client.graphql({
      query: CREATE_ACTIVE_HOME,
      variables: { activeSmartHomeId: id || null },
      authMode: "userPool",
    });
    return res?.data?.createUserProfile?.id || null;
  } catch (err) {
    console.warn("[activeHome] persist failed:", err);
    return profileId || null;
  }
}
