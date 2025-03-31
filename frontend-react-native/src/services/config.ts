/**
 * API configuration for the Scrape-N-Serve app
 */

// Base URL of the API - use localhost for dev, or specific IP for device testing
// For Android emulator, use 10.0.2.2 instead of localhost to access host machine
// For iOS simulator, localhost works
export const API_URL = 'http://10.0.2.2:8080';

// API endpoints
export const ENDPOINTS = {
  SCRAPE: '/api/v1/scrape',
  SCRAPE_STATUS: '/api/v1/scrape/status',
  DATA: '/api/v1/data',
};

// Default pagination values
export const DEFAULT_LIMIT = 10;
export const DEFAULT_OFFSET = 0;