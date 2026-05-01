import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Astron — Clone Any Research Brain Into an On-Chain Agent",
  description:
    "Input a Twitter handle. Pay once via x402. Astron synthesizes the Research Brain, archives it on 0G Storage, and mints a gasless iNFT on Base.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@200;300;400;500&family=Fira+Code:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ background: '#02030A', overflowX: 'hidden' }}>
        {children}
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
