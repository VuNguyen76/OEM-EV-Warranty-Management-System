// src/service/partApi.js
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Base URL trỏ đến Part Service (ví dụ: http://localhost:3004/api)
const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_PART_API,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = getState().user.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const partApi = createApi({
  reducerPath: "partApi",
  baseQuery,
  tagTypes: ["Part", "PartCatalog"],
  endpoints: (builder) => ({}),
});
