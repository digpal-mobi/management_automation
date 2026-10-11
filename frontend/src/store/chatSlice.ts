import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Message } from '@/types';

interface ChatState {
  messages: Message[];
  loading: boolean;
  askingAi: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [],
  loading: false,
  askingAi: false,
  error: null,
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
      state.loading = false;
      state.error = null;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      // Avoid duplicates
      const exists = state.messages.some((m) => m.id === action.payload.id);
      if (!exists) {
        state.messages.push(action.payload);
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setAskingAi: (state, action: PayloadAction<boolean>) => {
      state.askingAi = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearMessages: (state) => {
      state.messages = [];
      state.error = null;
    },
  },
});

export const {
  setMessages,
  addMessage,
  setLoading,
  setAskingAi,
  setError,
  clearMessages,
} = chatSlice.actions;

export default chatSlice.reducer;
