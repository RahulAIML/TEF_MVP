import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";

import "@/app/globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans"
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif"
});

export const metadata: Metadata = {
  title: "TEF Reading Practice",
  description: "TEF Canada B2 reading comprehension training platform MVP"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${serif.variable}`}>{children}</body>
    </html>
  );
}
