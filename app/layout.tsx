import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const sans = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const display = Space_Grotesk({
  variable: "--font-heading",
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
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
