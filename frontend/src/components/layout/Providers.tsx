'use client';

import React from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthProvider>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          richColors
          toastOptions={{
            style: {
              background: '#0f172a',
              border: '1px solid #1e293b',
              color: '#f8fafc',
            },
          }}
        />
      </AuthProvider>
    </Provider>
  );
}
