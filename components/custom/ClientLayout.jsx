"use client";

import { MessagesContext } from "@/context/MessagesContext";
import Header from "@/components/custom/Header";
import DiagnosticsHUD from "@/components/custom/DiagnosticsHUD";
import Providers from "@/app/provider";
import ConvexClientProvider from "@/app/ConvexClientProvider";

export default function ClientLayout({ children }) {
  return (
    <ConvexClientProvider>
      <Providers>
        <div className="flex flex-col min-h-screen relative bg-black">
          <Header />
          <main className="flex-1 relative">
            {children}
          </main>
          <DiagnosticsHUD />
        </div>
      </Providers>
    </ConvexClientProvider>
  );
}
