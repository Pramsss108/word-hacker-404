import type { Metadata } from "next"
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import "xterm/css/xterm.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const jetBrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Replica Studio · AI Motion Agent",
  description: "Hybrid Remotion + R3F workstation for medical-grade motion graphics",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${jetBrains.variable} app-body`}>
        <div className="app-shell">
          {children}
          <footer className="status-bar">
            <span>Replica Studio IDE · GPT-Driven Scenes</span>
            <span>PORT 3001 · ONLINE</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
