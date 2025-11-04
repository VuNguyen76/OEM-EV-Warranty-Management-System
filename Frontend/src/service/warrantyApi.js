import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Custom baseQuery để xử lý FormData
const baseQueryWithFormData = async (args, api, extraOptions) => {
  // Kiểm tra nếu args là object và có body là FormData
  if (args && typeof args === "object" && args.body instanceof FormData) {
    // Lấy token từ state
    const state = api.getState();
    const token = state.user?.token;

    // Tạo URL đầy đủ
    const baseUrl =
      import.meta.env.VITE_WARRANTY_API || "http://localhost:3003/api";
    const url = args.url.startsWith("http")
      ? args.url
      : `${baseUrl.replace(/\/$/, "")}/${args.url.replace(/^\//, "")}`;

    // Tạo headers
    const headers = new Headers();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // KHÔNG set Content-Type - browser sẽ tự động set với boundary cho multipart/form-data

    // Gọi fetch trực tiếp
    const response = await fetch(url, {
      method: args.method || "GET",
      headers: headers,
      body: args.body,
      credentials: "include",
    });

    // Xử lý response
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      return {
        error: {
          status: response.status,
          data: data,
        },
      };
    }

    return { data };
  }

  // Nếu không phải FormData, dùng baseQuery bình thường
  const baseQuery = fetchBaseQuery({
    baseUrl: import.meta.env.VITE_WARRANTY_API || "http://localhost:3003/api",
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
      const token = getState().user?.token;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  });

  return baseQuery(args, api, extraOptions);
};

export const warrantyApi = createApi({
  reducerPath: "warrantyApi",
  baseQuery: baseQueryWithFormData,
  tagTypes: ["WarrantyClaim", "RepairOrder"],
  endpoints: (builder) => ({}),
});
