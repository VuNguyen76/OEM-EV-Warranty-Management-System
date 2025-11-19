import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_CAMPAIGN_API,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = getState().user.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const campaignApi = createApi({
  reducerPath: "campaignApi",
  baseQuery: baseQuery,
  tagTypes: ["Campaign"],
  endpoints: (builder) => ({}),
});
