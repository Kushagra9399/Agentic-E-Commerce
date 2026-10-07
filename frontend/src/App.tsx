import React from 'react';
import './App.css';
import { CommerceProvider } from './context/CommerceContext';
import { AppRoutes } from './routes/AppRoutes';

export default function App() {
  return (
    <CommerceProvider>
      <AppRoutes />
    </CommerceProvider>
  );
}
