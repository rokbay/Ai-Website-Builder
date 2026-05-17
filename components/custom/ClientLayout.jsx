"use client";

import { MessagesContext } from "@/context/MessagesContext";
import Header from "@/components/custom/Header";
import { DiagnosticsHUD } from './DiagnosticsHUD';
import SettingsModal from "@/components/custom/SettingsModal";
import Providers from "@/app/provider";
import ConvexClientProvider from "@/app/ConvexClientProvider";

export default function ClientLayout({ children }) {
  return (
    <ConvexClientProvider>
      <Providers>
        <div className="flex flex-col min-h-screen relative bg-white overflow-y-auto">
          <Header />
          <main className="flex-1 relative overflow-y-auto">
            {children}
          </main>
          <DiagnosticsHUD />
          <SettingsModal />
        </div>
      </Providers>
    </ConvexClientProvider>
  );
}