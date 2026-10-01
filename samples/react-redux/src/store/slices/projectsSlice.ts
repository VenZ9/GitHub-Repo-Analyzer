import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Project } from '../../types/index';

interface ProjectsState {
  items: Project[];
  loading: boolean;
  error: string | null;
}

const initialState: ProjectsState = {
  items: [],
  loading: false,
  error: null
};

export const fetchProjects = createAsyncThunk('projects/fetch', async () => {
  return [
    { id: 'p1', name: 'Cloud Router', status: 'active', repository: 'github.com/org/router' },
    { id: 'p2', name: 'Neural Vector DB', status: 'active', repository: 'github.com/org/vectordb' }
  ];
});

export const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      });
  }
});

export default projectsSlice.reducer;
