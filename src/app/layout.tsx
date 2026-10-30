
import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "StockCRM | Inventory CRM",
  description: "Multi-channel inventory and marketplace management dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Sidebar />
        <main className="ml-64 min-h-screen min-w-0">
          {children}
        </main>
      </body>
    </html>
  );
}
