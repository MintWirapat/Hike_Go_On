export default function VerifyEmail() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-green-700 p-4 sm:p-6 md:p-8">
      <div className="bg-white p-6 sm:p-8 md:p-10 rounded-xl shadow-xl text-center w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg transition-all duration-300 hover:shadow-2xl">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 md:mb-8 text-green-700 tracking-wide leading-tight">
          ยืนยันอีเมลเรียบร้อยแล้ว
        </h1>
        <a
          href="https://hike-go-on.vercel.app/login"
          className="inline-block w-full sm:w-auto px-6 sm:px-8 py-3 bg-green-600 text-white text-base sm:text-lg font-medium rounded-lg hover:bg-green-700 transition-colors duration-300 shadow-md hover:shadow-lg"
        >
          เข้าสู่ระบบ
        </a>
      </div>
    </div>
  )
}
