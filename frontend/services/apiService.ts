import { API_BASE_URL } from './config';

// API response types
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  count?: number;
  total?: number;
  limit?: number;
  offset?: number;
  error?: string;
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
  created_at: string;
  updated_at: string;
}

export interface ScrapingOptions {
  url: string;
  max_depth?: number;
}

export interface ScrapingStatus {
  scraping: boolean;
  state: 'idle' | 'running';
  time: string;
}

export interface DataStats {
  total_items: number;
  latest_scrape: string;
}

// Use the v1 API prefix
const API_PREFIX = '/api/v1';

// Helper function for API requests
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const fullUrl = `${API_BASE_URL}${API_PREFIX}${endpoint}`;
    console.log(`Making request to: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}): ${errorText}`);
      return {
        status: 'error',
        message: `Server responded with status: ${response.status}`,
      };
    }

    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      status: 'error',
      message: 'Network request failed',
    };
  }
}

// Trigger scraping process
export async function triggerScraping(url: string, maxDepth?: number): Promise<ApiResponse> {
  const options: ScrapingOptions = { url };
  
  if (maxDepth !== undefined) {
    options.max_depth = maxDepth;
  }
  
  return apiRequest('/scrape', {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

// Get scraping status
export async function getScrapingStatus(): Promise<ApiResponse<ScrapingStatus>> {
  return apiRequest<ScrapingStatus>('/scrape/status');
}

// Fetch scraped data with pagination
export async function fetchScrapedData(
  limit: number = 100,
  offset: number = 0,
  sortBy: string = 'scraped_at',
  order: 'asc' | 'desc' = 'desc'
): Promise<ApiResponse<ScrapedItem[]>> {
  return apiRequest<ScrapedItem[]>(
    `/data?limit=${limit}&offset=${offset}&sort=${sortBy}&order=${order}`
  );
}

// Get a specific item by ID
export async function getItemById(id: number): Promise<ApiResponse<ScrapedItem>> {
  return apiRequest<ScrapedItem>(`/data/${id}`);
}

// Search scraped data
export async function searchScrapedData(
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<ApiResponse<ScrapedItem[]>> {
  return apiRequest<ScrapedItem[]>(
    `/data/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`
  );
}

// Get scraping stats
export async function getScrapingStats(): Promise<ApiResponse<DataStats>> {
  return apiRequest<DataStats>('/data/stats');
}

// Fallback to old API endpoints for compatibility
export async function legacyTriggerScraping(url: string): Promise<ApiResponse> {
  return apiRequest('/scrape', {
    method: 'POST',
    body: JSON.stringify({ url }),
  }, true);
}

// Helper function with optional API prefix override
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}, 
  skipApiPrefix: boolean = false
): Promise<ApiResponse<T>> {
  try {
    const prefix = skipApiPrefix ? '' : API_PREFIX;
    const fullUrl = `${API_BASE_URL}${prefix}${endpoint}`;
    
    const response = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}): ${errorText}`);
      return {
        status: 'error',
        message: `Server responded with status: ${response.status}`,
      };
    }

    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      status: 'error',
      message: 'Network request failed',
    };
  }
}
