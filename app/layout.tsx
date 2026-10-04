import type { ReactNode } from "react";

export const metadata = { title: "Liquid Lens Tab Bar" };

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
          background: "#0e1020",
          color: "#fff",
        }}
      >
        <main style={{ maxWidth: 520, margin: "0 auto", padding: "24px 16px 120px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}