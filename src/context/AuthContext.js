import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  fetchAuthSession,
  getCurrentUser,
  signOut as amplifySignOut,
} from "aws-amplify/auth";

const AuthContext = createContext(null);

/**
 * AuthProvider:
 * - authState: "loading" | "demo" | "authenticated"
 * - user: Cognito user object or null
 * - groups: array of Cognito group names
 */
export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState("loading");
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    let isMounted = true;

    // During SSR, there is no window and we don't want to call Amplify Auth.
    // Treat SSR render as DEMO mode; the client will rehydrate and run
    // the real auth check in the browser.
    if (typeof window === "undefined") {
      setAuthState("demo");
      return () => {
        isMounted = false;
      };
    }

    const loadUser = async () => {
      try {
        const current = await getCurrentUser();
        const session = await fetchAuthSession();

        const idToken = session?.tokens?.idToken;
        const cognitoGroups =
          idToken?.payload?.["cognito:groups"] || [];

        if (!isMounted) return;

        setUser(current);
        setGroups(cognitoGroups);
        setAuthState("authenticated");
      } catch (err) {
        if (!isMounted) return;
        // Not signed in → DEMO mode
        setUser(null);
        setGroups([]);
        setAuthState("demo");
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const signOut = async () => {
    try {
      await amplifySignOut();
    } catch (err) {
      console.error("Error signing out", err);
    } finally {
      setUser(null);
      setGroups([]);
      setAuthState("demo");
    }
  };

  const value = {
    authState,
    isLoading: authState === "loading",
    user,
    groups,
    isAuthenticated: authState === "authenticated",
    hasGroup: (g) => groups.includes(g),
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
