"use client"

import { useSearchParams } from "next/navigation"
import { AuthForm } from "@/components/auth/auth-form"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get("redirect") || "/"

  return (
    <div className="container mx-auto py-6 md:py-10 px-4">
      <AuthForm mode="login" redirectPath={redirectPath} />
    </div>
  )
}
