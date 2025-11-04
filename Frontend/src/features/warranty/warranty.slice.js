import { createSlice } from "@reduxjs/toolkit";

const warrantySlice = createSlice({
  name: "warranty",
  initialState: { searchResult: localStorage.getItem("result") ? JSON.parse(localStorage.getItem("result")) : null },
  reducers: {
    setSearchResult: (state, action) => {
      state.searchResult = action.payload;
    },
  },
});
export const { setSearchResult } = warrantySlice.actions;
export default warrantySlice.reducer;
