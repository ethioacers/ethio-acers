import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";

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
    <html lang="en">
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <body className="min-h-screen antialiased bg-background text-foreground">
          {children}
        </body>
      </ThemeProvider>
    </html>
  );
}
