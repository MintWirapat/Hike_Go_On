"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { addBankAccount, updateBankAccount, deleteBankAccount } from "@/lib/actions/payment-actions"

export default function BankAccountForm({ bankAccounts = [], onSuccess }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [accounts, setAccounts] = useState(bankAccounts)
  const [currentAccount, setCurrentAccount] = useState(null)
  const [formData, setFormData] = useState({
    bank_name: "",
    account_name: "",
    account_number: "",
    is_default: false,
  })

  useEffect(() => {
    setAccounts(bankAccounts)
  }, [bankAccounts])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (checked) => {
    setFormData((prev) => ({ ...prev, is_default: checked }))
  }

  const resetForm = () => {
    setFormData({
      bank_name: "",
      account_name: "",
      account_number: "",
      is_default: false,
    })
    setCurrentAccount(null)
    setError(null)
  }

  const openEditDialog = (account) => {
    setCurrentAccount(account)
    setFormData({
      bank_name: account.bank_name,
      account_name: account.account_name,
      account_number: account.account_number,
      is_default: account.is_default,
    })
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (account) => {
    setCurrentAccount(account)
    setIsDeleteDialogOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // ตรวจสอบข้อมูล
      if (!formData.bank_name || !formData.account_name || !formData.account_number) {
        throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน")
      }

      let result
      if (currentAccount) {
        // แก้ไขบัญชี
        result = await updateBankAccount(currentAccount.id, formData)
      } else {
        // เพิ่มบัญชีใหม่
        result = await addBankAccount(formData)
      }

      if (!result.success) {
        throw new Error(result.error)
      }

      // อัปเดตรายการบัญชี
      if (currentAccount) {
        setAccounts((prev) => prev.map((acc) => (acc.id === currentAccount.id ? result.data : acc)))
      } else {
        setAccounts((prev) => [...prev, result.data])
      }

      setIsDialogOpen(false)
      resetForm()
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error("Error submitting bank account:", error)
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!currentAccount) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await deleteBankAccount(currentAccount.id)

      if (!result.success) {
        throw new Error(result.error)
      }

      // อัปเดตรายการบัญชี
      setAccounts((prev) => prev.filter((acc) => acc.id !== currentAccount.id))
      setIsDeleteDialogOpen(false)
      resetForm()
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error("Error deleting bank account:", error)
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>บัญชีธนาคารสำหรับรับเงินโอน</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มบัญชีธนาคาร
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{currentAccount ? "แก้ไขบัญชีธนาคาร" : "เพิ่มบัญชีธนาคาร"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-md flex items-start">
                    <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="bank_name">ธนาคาร</Label>
                  <Input
                    id="bank_name"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleInputChange}
                    placeholder="เช่น กสิกรไทย, ไทยพาณิชย์"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_name">ชื่อบัญชี</Label>
                  <Input
                    id="account_name"
                    name="account_name"
                    value={formData.account_name}
                    onChange={handleInputChange}
                    placeholder="ชื่อเจ้าของบัญชี"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_number">เลขที่บัญชี</Label>
                  <Input
                    id="account_number"
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleInputChange}
                    placeholder="เลขที่บัญชี"
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="is_default" checked={formData.is_default} onCheckedChange={handleCheckboxChange} />
                  <Label htmlFor="is_default" className="font-normal">
                    ตั้งเป็นบัญชีหลัก
                  </Label>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    ยกเลิก
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        กำลังบันทึก...
                      </>
                    ) : (
                      "บันทึก"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <p>ยังไม่มีบัญชีธนาคาร</p>
              <p className="text-sm mt-1">เพิ่มบัญชีธนาคารเพื่อให้ผู้จองสามารถโอนเงินได้</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={`border rounded-md p-4 ${account.is_default ? "border-green-500 bg-green-50" : ""}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{account.bank_name}</h3>
                      <p className="text-sm text-gray-600">{account.account_name}</p>
                      <p className="text-sm text-gray-600">{account.account_number}</p>
                      {account.is_default && (
                        <span className="inline-block mt-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                          บัญชีหลัก
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => openEditDialog(account)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => openDeleteDialog(account)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบบัญชีธนาคาร</AlertDialogTitle>
            <AlertDialogDescription>คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีธนาคารนี้? การกระทำนี้ไม่สามารถย้อนกลับได้</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-red-500 hover:bg-red-600">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                "ลบ"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
