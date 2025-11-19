import { api } from "../../service/api";

const withUserPrefix = (path = "") => {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return normalized ? `user/${normalized}` : "user";
};

const centerApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAllCenters: builder.query({
      query: () => ({
        url: withUserPrefix("centers"),
        method: "GET",
      }),
      transformResponse: (response) => response.data,
      providesTags: ["Center"],
    }),
    getCenterById: builder.query({
      query: (id) => ({
        url: withUserPrefix(`centers/${id}`),
        method: "GET",
      }),
      providesTags: ["Center"],
    }),
    createCenter: builder.mutation({
      query: (data) => ({
        url: withUserPrefix("centers"),
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Center"],
    }),
    updateCenter: builder.mutation({
      query: ({ id, data }) => ({
        url: withUserPrefix(`centers/${id}`),
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Center"],
    }),
    deleteCenter: builder.mutation({
      query: (id) => ({
        url: withUserPrefix(`centers/${id}`),
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
