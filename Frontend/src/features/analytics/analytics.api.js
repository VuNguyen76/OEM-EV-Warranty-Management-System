import { analyticsApi } from "../../service/analyticsApi";

const extendedAnalyticsApi = analyticsApi.injectEndpoints({
  endpoints: (builder) => ({
    triggerAnalysis: builder.mutation({
        query: (period) => ({
          url: `/analytics/trigger?period=${period}`,
          method: "GET",
        }),
        invalidatesTags: ["Analytics"], // tự động refresh dữ liệu sau khi trigger
        transformResponse: (response) => response.data,
      }),
  
      // Lấy dữ liệu phân tích theo period (query param ?period=)
      getAnalyticsByPeriod: builder.query({
        query: (period) => ({
          url: "/analytics",
          method: "GET",
          params: period ? { period } : {},
        }),
        providesTags: ["Analytics"],
        transformResponse: (response) => response.data,
      }),

  }),
});

export const { useTriggerAnalysisMutation, useGetAnalyticsByPeriodQuery } = extendedAnalyticsApi;