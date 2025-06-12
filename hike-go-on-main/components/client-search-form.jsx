"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { AnimatedButton } from "@/components/ui/animated-button"

export default function ClientSearchForm() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <form onSubmit={handleSearch} className="flex max-w-xl mx-auto">
      <Input
        type="text"
        placeholder="ค้นหาตามสถานที่หรือชื่อแคมป์..."
        className="bg-white text-black rounded-r-none h-10 sm:h-12 flex-1 text-sm sm:text-base"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <AnimatedButton
        type="submit"
        className="bg-green-500 hover:bg-green-600 rounded-l-none h-10 sm:h-12 px-3 sm:px-4 md:px-6"
      >
        <Search className="h-4 w-4 sm:h-5 sm:w-5 md:mr-2" />
        <span className="hidden md:inline">ค้นหา</span>
      </AnimatedButton>
    </form>
  )
}
