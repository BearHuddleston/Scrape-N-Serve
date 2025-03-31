import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from './store';
import { fetchScrapedData, ScrapedItem } from './apiService';

interface DataState {
  data: ScrapedItem[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: DataState = {
  data: [],
  loading: false,
  error: null,
  lastFetched: null,
};

// Async thunk for fetching data
export const fetchData = createAsyncThunk(
  'data/fetchData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchScrapedData();
      if (response.status === 'success' && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch data');
      }
    } catch (error) {
      return rejectWithValue('An error occurred while fetching data');
    }
  }
);

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    clearData: (state) => {
      state.data = [];
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchData.fulfilled, (state, action: PayloadAction<ScrapedItem[]>) => {
        state.loading = false;
        state.data = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearData } = dataSlice.actions;

// Selectors
export const selectScrapedData = (state: RootState) => state.data.data;
export const selectDataLoading = (state: RootState) => state.data.loading;
export const selectDataError = (state: RootState) => state.data.error;
export const selectLastFetched = (state: RootState) => state.data.lastFetched;

export default dataSlice.reducer;
