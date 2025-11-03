import { configureStore } from "@reduxjs/toolkit";
import userReducer from "../features/user/user.slice";
import uiSlice from "../features/ui/uiSlice";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { userApi } from "../service/userApi";
import { vehicleApi } from "../service/vehicleApi";

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["user", "token"],
};

const persistedUserReducer = persistReducer(persistConfig, userReducer);

export const store = configureStore({
  reducer: {
    [userApi.reducerPath]: userApi.reducer,
    [vehicleApi.reducerPath]: vehicleApi.reducer,
    user: persistedUserReducer,
    ui: uiSlice,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(
      userApi.middleware,
      vehicleApi.middleware
    ),

});

export const persistor = persistStore(store);
