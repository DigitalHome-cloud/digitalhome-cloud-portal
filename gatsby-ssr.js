import React from "react";
import { Amplify } from "aws-amplify";
import awsExports from "./src/aws-exports.deployment";
import { AuthProvider } from "./src/context/AuthContext";

// Configure Amplify with the same backend config for SSR.
// AuthProvider is written to be SSR-safe and won't call browser APIs on the server.
Amplify.configure(awsExports);

export const wrapRootElement = ({ element }) => (
  <AuthProvider>{element}</AuthProvider>
);

export const onRenderBody = ({ setHtmlAttributes }) => {
  setHtmlAttributes({ lang: "en" });
};
