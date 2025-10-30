import { api } from "../../service/api";
import { setCredentials } from "../user/user.slice";
import { jwtDecode } from "jwt-decode";
const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (data) => ({
        url: "auth/login",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Auth"],
      async onQueryStarted(agr, { dispatch, queryFulfilled }) {
        try {
          const { data: res } = await queryFulfilled;
          const token = res.data.token;
          const user = jwtDecode(token);
          dispatch(setCredentials({ user, token }));
        } catch (error) {
          console.log(error);
        }
      },
    }),
  }),
});

export const { useLoginMutation } = authApi;
