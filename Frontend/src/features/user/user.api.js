import { userApi } from "../../service/userApi";

const extendedUserApi = userApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllUsers: builder.query({
      query: () => ({
        url: "users",
        method: "GET",
      }),
      transformResponse: (response) => response.data,
      providesTags: ["User"],
    }),

    getUserById: builder.query({
      query: (id) => ({
        url: `users/${id}`,
        method: "GET",
      }),
      providesTags: ["User"],
    }),

    updateUser: builder.mutation({
      query: ({ id, data }) => ({
        url: `users/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["User", "Technician"],
    }),

    deleteUser: builder.mutation({
      query: (id) => ({
        url: `users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User", "Technician"],
    }),

    registerUser: builder.mutation({
      query: (data) => ({
        url: "auth/register",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["User", "Technician"],
    }),
    createCenter: builder.mutation({
      query: (data) => ({
        url: "centers",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Center"],
    }),

    createTechnician: builder.mutation({
      query: (data) => ({
        url: "technicians",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Technician", "User"],
    }),
    getAllTechnicians: builder.query({
      query: () => ({
        url: "technicians",
        method: "GET",
      }),
      providesTags: ["Technician"],
      transformResponse: (response) => response.data,
    }),
    getTechnicianById: builder.query({
      query: (id) => ({
        url: `technicians/${id}`,
        method: "GET",
      }),
      providesTags: ["Technician"],
    }),
    updateTechnician: builder.mutation({
      query: ({ id, data }) => ({
        url: `technicians/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Technician"],
    }),
    deleteTechnician: builder.mutation({
      query: (id) => ({
        url: `technicians/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Technician"],
    }),
    assignTechnician: builder.mutation({
      query: (data) => ({
        url: `technicians/assign`,
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
