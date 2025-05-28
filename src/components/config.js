// API Configuration
// Replace this URL with your actual backend server URL
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Socket.IO configuration
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL;

// Mock mode for testing without backend
export const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true' || false;
