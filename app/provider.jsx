"use client";

import React, { useState } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { MessagesContext } from '@/context/MessagesContext';

function Provider({ children }) {
  const [messages, setMessages] = useState([]);
  
  return (
    <MessagesContext.Provider value={{ messages, setMessages }}>
      <NextThemesProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem 
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
    </MessagesContext.Provider>
  );
}

export default Provider;