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
      invalidatesTags: ["User"],
    }),

    deleteUser: builder.mutation({
      query: (id) => ({
        url: `users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),

    registerUser: builder.mutation({
      query: (data) => ({
        url: "auth/register",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetAllUsersQuery,
  useGetUserByIdQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useRegisterUserMutation,
} = extendedUserApi;
