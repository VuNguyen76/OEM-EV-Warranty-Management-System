import { configureStore } from "@reduxjs/toolkit";
import { api } from "../service/api";
import userReducer from "../features/userSlice/userSlice.slice";

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    user: userReducer,
  },
  tagTypes: ["Auth"],
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});
