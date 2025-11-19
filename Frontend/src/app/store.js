import { configureStore } from "@reduxjs/toolkit";
import userReducer from "../features/user/user.slice";
import uiSlice from "../features/ui/uiSlice";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import warrantySlice from "../features/warranty/warranty.slice";
import { api } from "../service/api";

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["user", "token"],
};

const persistedUserReducer = persistReducer(persistConfig, userReducer);

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    user: persistedUserReducer,
    ui: uiSlice,
    warranty: warrantySlice,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(
      api.middleware
    ),
});

export const persistor = persistStore(store);
