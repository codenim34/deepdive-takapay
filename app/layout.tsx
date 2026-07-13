import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ChatAssistant from "@/components/ChatAssistant";
import { loadRecords } from "@/lib/loadRecords";
import { buildAssistantContext } from "@/lib/assistantContext";

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
  const assistantContext = buildAssistantContext(loadRecords());

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full font-sans">
        <div className="flex min-h-full flex-col md:flex-row">
          <Sidebar />
          <div className="min-h-full min-w-0 flex-1 bg-slate-50">{children}</div>
        </div>
        <ChatAssistant context={assistantContext} />
      </body>
    </html>
  );
}
