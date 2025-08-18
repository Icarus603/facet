import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Crimson_Text, Playfair_Display, Libre_Baskerville } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const crimsonText = Crimson_Text({
  variable: "--font-crimson",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const libreBaskerville = Libre_Baskerville({
  variable: "--font-libre",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "FACET - Personalized Mental Health Support",
  description: "AI-powered mental health companion providing 24/7 personalized therapy and crisis intervention",
  keywords: ["mental health", "therapy", "AI", "wellness", "crisis support"],
  authors: [{ name: "FACET Team" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ backgroundColor: '#FAF9F5' }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${crimsonText.variable} ${playfairDisplay.variable} ${libreBaskerville.variable} antialiased`}
        style={{ backgroundColor: '#FAF9F5' }}
      >
        {children}
      </body>
    </html>
  );
}
