import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geist = localFont({ src: "./fonts/geist.woff2", variable: "--font-geist", weight: "100 900", display: "swap" });
const spaceGrotesk = localFont({ src: "./fonts/space-grotesk.woff2", variable: "--font-space-grotesk", weight: "300 700", display: "swap" });
const nunitoSans = localFont({ src: "./fonts/nunito-sans.woff2", variable: "--font-nunito-sans", weight: "200 900", display: "swap", preload: false });
const geistMono = localFont({ src: "./fonts/geist-mono.woff2", variable: "--font-geist-mono", weight: "100 900", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "APPS | Manufacturing",
  description: "Shop floor manufacturing board: part queues, quantities, drawings, and robot progress.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${spaceGrotesk.variable} ${nunitoSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-svh font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
