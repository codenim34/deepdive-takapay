import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TakaPay Social Listening | DeepDive Take-Home",
  description:
    "A social listening dashboard summarizing sentiment and topics for TakaPay, built for the DeepDive Associate Product Engineer take-home task.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
