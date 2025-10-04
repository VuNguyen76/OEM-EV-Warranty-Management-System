import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  modal: {
    isOpen: false,
    modalType: null,
    modalData: null,
  },
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openModal: (state, action) => {
      state.modal.isOpen = true;
      state.modal.modalType = action.payload.modalType;
      state.modal.modalData = action.payload.modalData;
    },
    closeModal: (state) => {
      state.modal.isOpen = false;
      state.modal.modalType = null;
      state.modal.modalData = null;
    },
  },
});

export const { openModal, closeModal } = uiSlice.actions;

export default uiSlice.reducer;
