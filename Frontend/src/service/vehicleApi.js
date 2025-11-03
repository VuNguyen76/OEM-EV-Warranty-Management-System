import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
console.log(import.meta.env.VITE_VEHICLE_API);


// Define a service using a base URL and expected endpoints
const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_VEHICLE_API,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = getState().user.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const vehicleApi = createApi({
  reducerPath: "vehicleApi",
  baseQuery: baseQuery,
  tagTypes: ["Vehicle"],
  endpoints: (builder) => ({}),
});
