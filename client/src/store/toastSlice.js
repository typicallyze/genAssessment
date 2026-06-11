import { createSlice } from '@reduxjs/toolkit';

let toastId = 0;

const toastSlice = createSlice({
  name: 'toast',
  initialState: {
    toasts: [],
  },
  reducers: {
    addToast: (state, action) => {
      state.toasts.push({ id: ++toastId, ...action.payload });
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { addToast, removeToast } = toastSlice.actions;

// Helper thunks
export const showToast = (type, message) => (dispatch) => {
  const id = ++toastId;
  dispatch(addToast({ id, type, message }));
  setTimeout(() => dispatch(removeToast(id)), 4000);
};

export default toastSlice.reducer;
