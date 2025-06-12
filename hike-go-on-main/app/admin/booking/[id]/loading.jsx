export default function AdminBookingDetailsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="h-5 w-40 bg-gray-200 rounded-md mb-6 animate-pulse"></div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="h-8 w-48 bg-gray-200 rounded-md animate-pulse"></div>
            <div className="h-6 w-32 bg-gray-200 rounded-md animate-pulse"></div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="h-7 w-36 bg-gray-200 rounded-md mb-4 animate-pulse"></div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="h-6 w-48 bg-gray-200 rounded-md mb-3 animate-pulse"></div>
                <div className="h-4 w-full bg-gray-200 rounded-md mb-2 animate-pulse"></div>
                <div className="h-4 w-3/4 bg-gray-200 rounded-md mb-4 animate-pulse"></div>

                {[...Array(4)].map((_, index) => (
                  <div key={index} className="flex items-center mb-3">
                    <div className="h-5 w-5 bg-gray-200 rounded-md mr-2 animate-pulse"></div>
                    <div className="h-4 w-48 bg-gray-200 rounded-md animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="h-7 w-36 bg-gray-200 rounded-md mb-4 animate-pulse"></div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 bg-gray-200 rounded-full mr-4 animate-pulse"></div>
                  <div>
                    <div className="h-5 w-32 bg-gray-200 rounded-md mb-2 animate-pulse"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded-md animate-pulse"></div>
                  </div>
                </div>

                {[...Array(2)].map((_, index) => (
                  <div key={index} className="mb-2">
                    <div className="h-4 w-40 bg-gray-200 rounded-md animate-pulse"></div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex space-x-4">
                <div className="flex-1 h-10 bg-gray-200 rounded-md animate-pulse"></div>
                <div className="flex-1 h-10 bg-gray-200 rounded-md animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
