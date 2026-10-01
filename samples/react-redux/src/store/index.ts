import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import projectsReducer from './slices/projectsSlice';
import { baseApi } from './api/baseApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    projects: projectsReducer,
    [baseApi.reducerPath]: baseApi.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware)
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
