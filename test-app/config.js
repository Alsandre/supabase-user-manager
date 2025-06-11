// Test App Configuration
// This file handles environment variables and configuration for the test app

// Supabase Configuration
export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || "",
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  redirectUrl: import.meta.env.VITE_REDIRECT_URL || "http://localhost:5173/verify",
};

// App Configuration
export const appConfig = {
  debugMode: import.meta.env.VITE_DEBUG_MODE === "true",
  appName: "User Manager Test App",
  version: "0.1.0",
};

// Validation function
export function validateConfig() {
  const errors = [];

  if (!supabaseConfig.url) {
    errors.push("VITE_SUPABASE_URL is required");
  }

  if (!supabaseConfig.anonKey) {
    errors.push("VITE_SUPABASE_ANON_KEY is required");
  }

  if (errors.length > 0) {
    console.error("Configuration errors:", errors);
    return false;
  }

  if (appConfig.debugMode) {
    console.log("Configuration loaded:", {
      supabaseUrl: supabaseConfig.url,
      redirectUrl: supabaseConfig.redirectUrl,
      debugMode: appConfig.debugMode,
    });
  }

  return true;
}

// Export for easy access
export default {
  supabase: supabaseConfig,
  app: appConfig,
  validate: validateConfig,
};
