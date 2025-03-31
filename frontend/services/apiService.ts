import { API_BASE_URL } from './config';

// API response types
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  count?: number;
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
}

// Helper function for API requests
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...options,
    });

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
export async function triggerScraping(url: string): Promise<ApiResponse> {
  return apiRequest('/scrape', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

// Fetch scraped data
export async function fetchScrapedData(limit: number = 100): Promise<ApiResponse<ScrapedItem[]>> {
  return apiRequest<ScrapedItem[]>(`/data?limit=${limit}`);
}

// Search scraped data
export async function searchScrapedData(
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<ApiResponse<ScrapedItem[]>> {
  return apiRequest<ScrapedItem[]>(`/data/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
}

// Get scraping stats
export async function getScrapingStats(): Promise<ApiResponse> {
  return apiRequest('/data/stats');
}
