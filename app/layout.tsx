import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Robot Simulator",
  description: "Interactive 3D robot simulation with Three.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
