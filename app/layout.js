import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/custom/ClientLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Bolt Engine // Elite Spec-Driven IDE",
  description: "High-performance, local-first neural project synthesizer. Accelerated synthesis via .NET bridge and Convex real-time sync.",
  keywords: ["AI Website Builder", "Spec-Driven Development", "Local AI", "Ollama", "Convex", "Next.js"],
  manifest: "/manifest.json",
  themeColor: "#000000",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  robots: "index, follow",
  openGraph: {
    title: "Bolt Engine // Elite Spec-Driven IDE",
    description: "Production-grade project synthesis.",
    type: "website",
    url: "https://bolt-engine.nexus",
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="bg-black scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Bolt Engine",
              "operatingSystem": "Web, Windows, Linux, macOS",
              "applicationCategory": "DeveloperApplication",
              "description": "Elite local-first neural project synthesizer.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              }
            })
          }}
        />
      </head>
      <body className={`${inter.className} bg-[#020617] text-white antialiased selection:bg-blue-600/30 selection:text-white`}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
