import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

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
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full font-sans">
        <div className="flex min-h-full">
          <Sidebar />
          <div className="min-h-full min-w-0 flex-1 bg-slate-50">{children}</div>
        </div>
      </body>
    </html>
  );
}
