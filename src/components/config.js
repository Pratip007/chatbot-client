// API Configuration
// Replace this URL with your actual backend server URL
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Use environment variables or fallback to appropriate defaults
let apiUrl = import.meta.env.VITE_API_URL || 
  (isProduction ? 'https://api.urbanwealthcapitals.com' : 'http://localhost:5000');

// Remove trailing slash to prevent double slashes
apiUrl = apiUrl.replace(/\/$/, '');

export const API_URL = apiUrl;

// Socket.IO configuration
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL;

// Mock mode for testing without backend
export const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true' || false;

console.log('Environment:', { isDevelopment, isProduction, API_URL, SOCKET_URL });
