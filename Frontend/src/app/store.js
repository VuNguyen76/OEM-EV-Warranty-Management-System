import { configureStore } from "@reduxjs/toolkit";
import userReducer from "../features/user/user.slice";
import uiSlice from "../features/ui/uiSlice";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { userApi } from "../service/userApi";
import { vehicleApi } from "../service/vehicleApi";
import { partApi } from "../service/partApi";
import { warrantyApi } from "../service/warrantyApi";
import warrantySlice from "../features/warranty/warranty.slice";
import { campaignApi } from "../service/campaignApi";

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
    [partApi.reducerPath]: partApi.reducer,
    [warrantyApi.reducerPath]: warrantyApi.reducer,
    [campaignApi.reducerPath]: campaignApi.reducer,
    user: persistedUserReducer,
    ui: uiSlice,
    warranty: warrantySlice,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(
      userApi.middleware,
      vehicleApi.middleware,
      partApi.middleware,
      warrantyApi.middleware,
      campaignApi.middleware
    ),
});

export const persistor = persistStore(store);
