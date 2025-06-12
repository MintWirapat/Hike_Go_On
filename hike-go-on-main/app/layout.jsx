import { Suspense } from "react"
import { Prompt } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/navbar"
import { SupabaseProvider } from "@/lib/supabase/supabase-provider"
import "./globals.css"

const prompt = Prompt({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  display: "swap",
})

export const metadata = {
  title: "Hike Go On - ค้นหาสถานที่แคมป์ปิ้งที่ดีที่สุด",
  description: "ค้นหาและเปรียบเทียบสถานที่แคมป์มากกว่า 100 แห่งทั่วประเทศไทย",
  generator: "v0.dev",
  icons: {
    icon: "/logo.png",
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="th" className="scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <link
          href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={prompt.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <SupabaseProvider>
            <Suspense fallback={<div className="h-16 bg-white shadow-sm"></div>}>
              <Navbar />
            </Suspense>
            <main className="min-h-screen flex flex-col">
              <Suspense fallback={<div className="animate-pulse bg-gray-100 min-h-screen"></div>}>{children}</Suspense>
            </main>
            <footer className="bg-gray-100 py-6">
              <div className="container mx-auto px-4 text-center text-sm text-gray-600">
                <p>© 2025 Hike Go On - ลิขสิทธิ์เว็บไซต์โดย Hike Go On</p>
              </div>
            </footer>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
