// API configuration
// In a containerized environment, API requests from the browser need to go through
// our nginx proxy rather than directly to the backend container
export const API_BASE_URL = '/api'; // Requests to /api will be proxied to the backend

// Other configuration options
export const DEFAULT_ITEMS_LIMIT = 50;
export const REFRESH_INTERVAL = 60000; // 1 minute in milliseconds
