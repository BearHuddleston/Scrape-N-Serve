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
    const response = await apiService.getScrapedData(limit, offset, sort, order);
    return response;
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
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchScrapedData.fulfilled, (state, action: PayloadAction<DataResponse>) => {
        state.loading = false;
        state.items = action.payload.data;
        state.totalItems = action.payload.total;
      })
      .addCase(fetchScrapedData.rejected, (state, action) => {
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
        state.scraping = action.payload.scraping;
      });
  },
});

export const { clearError } = dataSlice.actions;
export default dataSlice.reducer;