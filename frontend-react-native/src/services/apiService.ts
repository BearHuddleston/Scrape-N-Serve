import axios from 'axios';
import { API_URL, ENDPOINTS } from './config';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface ScrapeRequest {
  url: string;
  max_depth?: number;
}

export interface ScrapedItem {
  id: number;
  title: string;
  description: string;
  url: string;
  image_url: string;
  price: number;
  scraped_at: string;
  metadata: string;
}

export interface ScrapingStatus {
  scraping: boolean;
  state: 'idle' | 'running';
  time: string;
}

export interface DataResponse {
  status: string;
  count: number;
  total: number;
  limit: number;
  offset: number;
  data: ScrapedItem[];
}

// API functions
export const apiService = {
  // Start scraping a URL
  startScraping: async (request: ScrapeRequest) => {
    try {
      const response = await api.post(ENDPOINTS.SCRAPE, request);
      return response.data;
    } catch (error) {
      console.error('Error starting scraping:', error);
      throw error;
    }
  },

  // Get current scraping status
  getScrapingStatus: async (): Promise<ScrapingStatus> => {
    try {
      const response = await api.get(ENDPOINTS.SCRAPE_STATUS);
      return response.data;
    } catch (error) {
      console.error('Error getting scraping status:', error);
      throw error;
    }
  },

  // Get scraped data with pagination and sorting
  getScrapedData: async (
    limit = 10,
    offset = 0,
    sort = 'scraped_at',
    order = 'desc'
  ): Promise<DataResponse> => {
    try {
      const response = await api.get(ENDPOINTS.DATA, {
        params: {
          limit,
          offset,
          sort,
          order,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error getting scraped data:', error);
      throw error;
    }
  },

  // Get a specific scraped item by ID
  getItemById: async (id: number) => {
    try {
      const response = await api.get(`${ENDPOINTS.DATA}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting item ${id}:`, error);
      throw error;
    }
  },
};