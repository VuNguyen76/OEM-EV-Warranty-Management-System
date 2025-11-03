import { userApi } from "../../service/userApi";
const centerApi = userApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllCenters: builder.query({
      query: () => ({
        url: "centers",
        method: "GET",
      }),
      transformResponse: (response) => response.data,
      providesTags: ["Center"],
    }),
    getCenterById: builder.query({
      query: (id) => ({
        url: `centers/${id}`,
        method: "GET",
      }),
      providesTags: ["Center"],
    }),
    createCenter: builder.mutation({
      query: (data) => ({
        url: "centers",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Center"],
    }),
    updateCenter: builder.mutation({
      query: ({ id, data }) => ({
        url: `centers/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Center"],
    }),
    deleteCenter: builder.mutation({
      query: (id) => ({
        url: `centers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Center"],
    }),
  }),
});

export const {
  useGetAllCentersQuery,
  useGetCenterByIdQuery,
  useCreateCenterMutation,
  useUpdateCenterMutation,
  useDeleteCenterMutation,
} = centerApi;
