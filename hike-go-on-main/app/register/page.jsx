import { AuthForm } from "@/components/auth/auth-form"

export default function RegisterPage() {
  return (
    <div className="container mx-auto py-6 md:py-10 px-4">
      <AuthForm mode="register" />
    </div>
  )
}
