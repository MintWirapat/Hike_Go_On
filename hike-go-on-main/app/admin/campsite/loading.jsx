export default function AdminCampsiteLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="h-8 w-48 bg-gray-200 rounded-md mb-6 animate-pulse"></div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="h-6 w-36 bg-gray-200 rounded-md animate-pulse"></div>
          <div className="h-4 w-64 bg-gray-200 rounded-md mt-2 animate-pulse"></div>
        </div>

        <div className="p-6">
          <div className="h-10 bg-gray-200 rounded-md mb-6 animate-pulse"></div>

          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-100 rounded-md">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="ml-4">
                    <div className="h-4 w-32 bg-gray-200 rounded-md animate-pulse"></div>
                    <div className="h-3 w-24 bg-gray-200 rounded-md mt-2 animate-pulse"></div>
                  </div>
                </div>
                <div className="h-4 w-20 bg-gray-200 rounded-md animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
