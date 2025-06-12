import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

export default function FinanceLoading() {
  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <Skeleton className="h-8 w-64 mb-2" />
      <Skeleton className="h-5 w-96 mb-6" />
      <Separator className="mb-6" />

      <div className="space-y-6">
        <div className="flex space-x-2 mb-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <Skeleton className="h-7 w-48 mb-4" />
          <Skeleton className="h-5 w-full max-w-md mb-6" />

          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
