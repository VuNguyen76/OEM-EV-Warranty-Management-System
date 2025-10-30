import { createSlice } from "@reduxjs/toolkit";

const centerSlice = createSlice({
  name: "user",
  initialState: { center: null },
  reducers: {
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
    },
  },
});
export const { setCredentials, logout } = centerSlice.actions;
export default centerSlice.reducer;
