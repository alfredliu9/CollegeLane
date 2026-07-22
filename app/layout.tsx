import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./functional.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CollegeLane | Your path to collegiate athletics",
  description: "Educational recruiting guidance for Canadian high school track-and-field athletes.",
  icons: {
    icon: "/collegelane-logo.png",
    shortcut: "/collegelane-logo.png",
    apple: "/collegelane-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
