import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ethio Acers",
  description: "Practice national exam questions and track your study streak",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased bg-background text-foreground">{children}</body>
    </html>
  );
}
