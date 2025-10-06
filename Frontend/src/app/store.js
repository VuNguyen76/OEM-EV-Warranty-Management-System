import { configureStore } from "@reduxjs/toolkit";
import { api } from "../service/api";
import userReducer from "../features/userSlice/userSlice.slice";
import uiSlice from "../features/ui/uiSlice";

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    user: userReducer,
    ui: uiSlice,
  },
  tagTypes: ["Auth"],
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});
