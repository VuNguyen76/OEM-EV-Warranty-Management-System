import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { setCredentials, logout } from "../features/user/user.slice";

// Define a service using a base URL and expected endpoints
const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_USER_API,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = getState().user.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: baseQuery,
  tagTypes: ["Auth", "User", "Center", "Technician"],
  endpoints: (builder) => ({}),
});
