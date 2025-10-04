import { api } from "../../service/api";
import { logout } from "../userSlice/userSlice.slice";

const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (data) => ({
        url: "auth/login",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Auth"],
    }),
    register: builder.mutation({
      query: (data) => ({
        url: "auth/register",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Auth"],
    }),
    logout: builder.mutation({
      query: () => ({
        url: "auth/logout",
        method: "POST",
      }),

      invalidatesTags: ["Auth"],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(logout());
        } catch (error) {
          console.log(error);
        }
      },
    }),
    getUserById: builder.query({
      query: (id) => ({
        url: `auth/${id}`,
      }),
      providesTags: (result, error, id) => [{ type: "Auth", id }],
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useGetUserByIdQuery, useLogoutMutation } =
  authApi;
