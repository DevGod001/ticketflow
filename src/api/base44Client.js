import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication disabled for local development
export const base44 = createClient({
  appId: "68c7d268f06cf31d79a9f26d", 
  requiresAuth: false // Disable authentication for local development
});
