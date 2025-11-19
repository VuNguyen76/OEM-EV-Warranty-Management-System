import { api } from "../../service/api";

const withUserPrefix = (path = "") => {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return normalized ? `user/${normalized}` : "user";
};

const extendedUserApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAllUsers: builder.query({
      query: () => ({
        url: withUserPrefix("users"),
        method: "GET",
      }),
      transformResponse: (response) => response.data,
      providesTags: ["User"],
    }),

    getUserById: builder.query({
      query: (id) => ({
        url: withUserPrefix(`users/${id}`),
        method: "GET",
      }),
      providesTags: ["User"],
    }),

    updateUser: builder.mutation({
      query: ({ id, data }) => ({
        url: withUserPrefix(`users/${id}`),
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["User", "Technician"],
    }),

    deleteUser: builder.mutation({
      query: (id) => ({
        url: withUserPrefix(`users/${id}`),
        method: "DELETE",
      }),
      invalidatesTags: ["User", "Technician"],
    }),

    registerUser: builder.mutation({
      query: (data) => ({
        url: withUserPrefix("auth/register"),
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["User", "Technician"],
    }),
    createCenter: builder.mutation({
      query: (data) => ({
        url: withUserPrefix("centers"),
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Center"],
    }),

    createTechnician: builder.mutation({
      query: (data) => ({
        url: withUserPrefix("technicians"),
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Technician", "User"],
    }),
    getAllTechnicians: builder.query({
      query: () => ({
        url: withUserPrefix("technicians"),
        method: "GET",
      }),
      providesTags: ["Technician"],
      transformResponse: (response) => response.data,
    }),
    getTechnicianById: builder.query({
      query: (id) => ({
        url: withUserPrefix(`technicians/${id}`),
        method: "GET",
      }),
      providesTags: ["Technician"],
    }),
    updateTechnician: builder.mutation({
      query: ({ id, data }) => ({
        url: withUserPrefix(`technicians/${id}`),
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Technician"],
    }),
    deleteTechnician: builder.mutation({
      query: (id) => ({
        url: withUserPrefix(`technicians/${id}`),
        method: "DELETE",
      }),
      invalidatesTags: ["Technician"],
    }),
    assignTechnician: builder.mutation({
      query: (data) => ({
        url: withUserPrefix(`technicians/assign`),
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Technician"],
    }),
  }),
});

export const {
  useGetAllUsersQuery,
  useGetUserByIdQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useRegisterUserMutation,
  useCreateTechnicianMutation,
  useGetAllTechniciansQuery,
  useGetTechnicianByIdQuery,
  useUpdateTechnicianMutation,
  useDeleteTechnicianMutation,
  useAssignTechnicianMutation,
  useCreateCenterMutation,
} = extendedUserApi;
