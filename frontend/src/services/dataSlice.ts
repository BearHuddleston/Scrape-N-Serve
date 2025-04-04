import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService, ScrapedItem, ScrapeRequest, DataResponse } from './apiService';

// Define the state type
interface DataState {
  items: ScrapedItem[];
  totalItems: number;
  loading: boolean;
  error: string | null;
  scraping: boolean;
}

// Initial state
const initialState: DataState = {
  items: [],
  totalItems: 0,
  loading: false,
  error: null,
  scraping: false,
};

// Async thunks
export const fetchScrapedData = createAsyncThunk(
  'data/fetchScrapedData',
  async ({ limit, offset, sort, order }: { limit: number; offset: number; sort: string; order: string }) => {
    console.log('fetchScrapedData thunk called with params:', { limit, offset, sort, order });
    try {
      const response = await apiService.getScrapedData(limit, offset, sort, order);
      console.log('fetchScrapedData received response:', response);
      return response;
    } catch (error) {
      console.error('fetchScrapedData error:', error);
      throw error;
    }
  }
);

export const startScraping = createAsyncThunk(
  'data/startScraping',
  async (request: ScrapeRequest) => {
    const response = await apiService.startScraping(request);
    return response;
  }
);

export const fetchScrapingStatus = createAsyncThunk(
  'data/fetchScrapingStatus',
  async () => {
    const response = await apiService.getScrapingStatus();
    return response;
  }
);

// Create the slice
const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch data cases
      .addCase(fetchScrapedData.pending, (state) => {
        console.log('fetchScrapedData.pending reducer called');
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchScrapedData.fulfilled, (state, action: PayloadAction<any>) => {
        console.log('fetchScrapedData.fulfilled reducer called with payload:', action.payload);
        state.loading = false;
        
        // Store the entire response in state for maximum flexibility
        // This allows components to handle different API response structures
        state.items = action.payload;
        
        if (action.payload && typeof action.payload === 'object') {
          // Extract total items count for pagination
          if (action.payload.total !== undefined) {
            state.totalItems = action.payload.total;
          } else if (action.payload.count !== undefined) {
            state.totalItems = action.payload.count;
          } else if (action.payload.data && Array.isArray(action.payload.data)) {
            state.totalItems = action.payload.data.length;
          } else if (Array.isArray(action.payload)) {
            state.totalItems = action.payload.length;
          }
          
          console.log('State updated with payload, total items:', state.totalItems);
        } else {
          console.error('Invalid payload structure:', action.payload);
          state.error = 'Invalid data format received from server';
        }
      })
      .addCase(fetchScrapedData.rejected, (state, action) => {
        console.log('fetchScrapedData.rejected reducer called with error:', action.error);
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch data';
      })

      // Start scraping cases
      .addCase(startScraping.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startScraping.fulfilled, (state) => {
        state.loading = false;
        state.scraping = true;
      })
      .addCase(startScraping.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to start scraping';
      })

      // Fetch status cases
      .addCase(fetchScrapingStatus.fulfilled, (state, action) => {
        // Just update the scraping status - component will handle refresh
        state.scraping = action.payload.scraping;
      });
  },
});

export const { clearError } = dataSlice.actions;
export default dataSlice.reducer;