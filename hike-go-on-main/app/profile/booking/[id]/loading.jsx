import { Loader2 } from "lucide-react"

export default function BookingDetailLoading() {
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-green-500" />
      </div>
    </div>
  )
}
