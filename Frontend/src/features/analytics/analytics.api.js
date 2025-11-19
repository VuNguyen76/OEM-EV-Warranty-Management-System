import { api } from "../../service/api";

const withAnalyticsPrefix = (path = "") => {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return normalized ? `analytics/${normalized}` : "analytics";
};

const extendedAnalyticsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    triggerAnalysis: builder.mutation({
        query: (period) => ({
          url: withAnalyticsPrefix(`trigger?period=${period}`),
          method: "GET",
        }),
        invalidatesTags: ["Analytics"], // tự động refresh dữ liệu sau khi trigger
        transformResponse: (response) => response.data,
      }),
  
      // Lấy dữ liệu phân tích theo period (query param ?period=)
      getAnalyticsByPeriod: builder.query({
        query: (period) => ({
          url: withAnalyticsPrefix(""),
          method: "GET",
          params: period ? { period } : {},
        }),
        providesTags: ["Analytics"],
        transformResponse: (response) => response.data,
      }),

  }),
});

export const { useTriggerAnalysisMutation, useGetAnalyticsByPeriodQuery } = extendedAnalyticsApi;