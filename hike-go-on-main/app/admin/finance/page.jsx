export const dynamic = "force-dynamic"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import BankAccountForm from "@/components/payment/bank-account-form"
import { getBankAccounts } from "@/lib/actions/payment-actions"

export default async function FinancePage() {
  const bankAccounts = await getBankAccounts()

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">การจัดการการเงิน</h1>
      <p className="text-gray-500 mb-6">จัดการบัญชีธนาคารและดูข้อมูลการเงินของแคมป์ของคุณ</p>
      <Separator className="mb-6" />

      <Tabs defaultValue="bank-accounts" className="w-full">
        <TabsList className="mb-6 w-full justify-start">
          <TabsTrigger value="bank-accounts" className="px-4">
            บัญชีธนาคาร
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bank-accounts">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">บัญชีธนาคาร</h2>
            <p className="text-gray-500 mb-6">เพิ่มบัญชีธนาคารของคุณเพื่อให้ผู้จองสามารถโอนเงินค่าจองแคมป์ได้</p>
            <BankAccountForm bankAccounts={bankAccounts} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
