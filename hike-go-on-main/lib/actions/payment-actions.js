"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

/**
 * ดึงข้อมูลบัญชีธนาคารของเจ้าของแคมป์
 */
export async function getBankAccounts() {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบ" }
    }

    // ดึงข้อมูลบัญชีธนาคาร
    const { data, error } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("owner_id", session.user.id)
      .order("is_default", { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Error in getBankAccounts:", error)
    return []
  }
}

/**
 * ดึงข้อมูลบัญชีธนาคารของเจ้าของแคมป์ตาม ID
 */
export async function getCampsiteOwnerBankAccounts(ownerId) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ดึงข้อมูลบัญชีธนาคาร
    const { data, error } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("is_default", true)

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Error in getCampsiteOwnerBankAccounts:", error)
    return []
  }
}

/**
 * เพิ่มบัญชีธนาคาร
 */
export async function addBankAccount(bankData) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบ" }
    }

    // ถ้าเป็นบัญชีหลัก ให้ยกเลิกบัญชีหลักเดิมก่อน
    if (bankData.is_default) {
      await supabase
        .from("bank_accounts")
        .update({ is_default: false })
        .eq("owner_id", session.user.id)
        .eq("is_default", true)
    }

    // เพิ่มบัญชีธนาคาร
    const { data, error } = await supabase
      .from("bank_accounts")
      .insert({
        ...bankData,
        owner_id: session.user.id,
      })
      .select()

    if (error) throw error

    revalidatePath("/admin/finance")
    return { success: true, data: data[0] }
  } catch (error) {
    console.error("Error in addBankAccount:", error)
    return { success: false, error: error.message }
  }
}

/**
 * แก้ไขบัญชีธนาคาร
 */
export async function updateBankAccount(id, bankData) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบ" }
    }

    // ตรวจสอบว่าเป็นเจ้าของบัญชีหรือไม่
    const { data: bankAccount, error: fetchError } = await supabase
      .from("bank_accounts")
      .select("owner_id")
      .eq("id", id)
      .single()

    if (fetchError) throw fetchError
    if (bankAccount.owner_id !== session.user.id) {
      return { success: false, error: "คุณไม่มีสิทธิ์แก้ไขบัญชีนี้" }
    }

    // ถ้าเป็นบัญชีหลัก ให้ยกเลิกบัญชีหลักเดิมก่อน
    if (bankData.is_default) {
      await supabase
        .from("bank_accounts")
        .update({ is_default: false })
        .eq("owner_id", session.user.id)
        .eq("is_default", true)
        .neq("id", id)
    }

    // แก้ไขบัญชีธนาคาร
    const { data, error } = await supabase.from("bank_accounts").update(bankData).eq("id", id).select()

    if (error) throw error

    revalidatePath("/admin/finance")
    return { success: true, data: data[0] }
  } catch (error) {
    console.error("Error in updateBankAccount:", error)
    return { success: false, error: error.message }
  }
}

/**
 * ลบบัญชีธนาคาร
 */
export async function deleteBankAccount(id) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบ" }
    }

    // ตรวจสอบว่าเป็นเจ้าของบัญชีหรือไม่
    const { data: bankAccount, error: fetchError } = await supabase
      .from("bank_accounts")
      .select("owner_id")
      .eq("id", id)
      .single()

    if (fetchError) throw fetchError
    if (bankAccount.owner_id !== session.user.id) {
      return { success: false, error: "คุณไม่มีสิทธิ์ลบบัญชีนี้" }
    }

    // ลบบัญชีธนาคาร
    const { error } = await supabase.from("bank_accounts").delete().eq("id", id)

    if (error) throw error

    revalidatePath("/admin/finance")
    return { success: true }
  } catch (error) {
    console.error("Error in deleteBankAccount:", error)
    return { success: false, error: error.message }
  }
}

/**
 * ตั้งค่าวิธีการชำระเงินเป็นเงินสด
 */
export async function setCashPayment(bookingId, amount) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบ" }
    }

    // ตรวจสอบว่าเป็นเจ้าของการจองหรือไม่
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("user_id, campsite_id")
      .eq("id", bookingId)
      .single()

    if (fetchError) {
      console.error("Error fetching booking:", fetchError)
      return { success: false, error: "ไม่พบข้อมูลการจอง" }
    }

    if (booking.user_id !== session.user.id) {
      return { success: false, error: "คุณไม่มีสิทธิ์แก้ไขการจองนี้" }
    }

    // ลบข้อมูลการชำระเงินเดิม (ถ้ามี)
    await supabase.from("payments").delete().eq("booking_id", bookingId)

    // อัปเดตวิธีการชำระเงิน
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        payment_method: "cash",
        payment_status: "pending",
      })
      .eq("id", bookingId)

    if (updateError) {
      console.error("Error updating booking:", updateError)
      return { success: false, error: "ไม่สามารถอัปเดตข้อมูลการจองได้" }
    }

    // สร้างรายการชำระเงิน
    const { error: paymentError } = await supabase.from("payments").insert({
      booking_id: bookingId,
      amount: amount,
      payment_method: "cash",
      payment_status: "pending",
      notes: "ชำระเงินที่แคมป์",
    })

    if (paymentError) {
      console.error("Error creating payment:", paymentError)
      return { success: false, error: "ไม่สามารถสร้างรายการชำระเงินได้" }
    }

    // ดึงข้อมูลแคมป์เพื่อส่งการแจ้งเตือนให้เจ้าของแคมป์
    const { data: campsite, error: campsiteError } = await supabase
      .from("campsites")
      .select("owner_id, name")
      .eq("id", booking.campsite_id)
      .single()

    if (!campsiteError && campsite) {
      // สร้างการแจ้งเตือนสำหรับเจ้าของแคมป์
      await supabase.from("notifications").insert({
        user_id: campsite.owner_id,
        title: "มีการเลือกวิธีชำระเงิน",
        message: `ลูกค้าเลือกชำระเงินที่แคมป์สำหรับการจอง ${campsite.name}`,
        type: "payment_method_selected",
        reference_id: bookingId,
        is_read: false,
      })
    }

    revalidatePath(`/profile/booking/${bookingId}`)
    revalidatePath(`/admin/booking/${bookingId}`)
    return { success: true }
  } catch (error) {
    console.error("Error in setCashPayment:", error)
    return { success: false, error: error.message }
  }
}

/**
 * อัปโหลดสลิปการโอนเงิน
 */
export async function uploadPaymentSlip(bookingId, formData) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบ" }
    }

    // ตรวจสอบว่าเป็นเจ้าของการจองหรือไม่
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("user_id, total_price, campsite_id")
      .eq("id", bookingId)
      .single()

    if (fetchError) throw fetchError
    if (booking.user_id !== session.user.id) {
      return { success: false, error: "คุณไม่มีสิทธิ์แก้ไขการจองนี้" }
    }

    // ดึงข้อมูลจาก formData
    const slipFile = formData.get("slip")
    const bankName = formData.get("bank_name")
    const accountNumber = formData.get("account_number")
    const transactionDate = formData.get("transaction_date")
    const notes = formData.get("notes")

    if (!slipFile) {
      return { success: false, error: "กรุณาอัปโหลดสลิปการโอนเงิน" }
    }

    // ลบข้อมูลการชำระเงินเดิม (ถ้ามี)
    await supabase.from("payments").delete().eq("booking_id", bookingId)

    // อัปโหลดสลิป
    // สร้างชื่อไฟล์ที่ปลอดภัยโดยไม่ใช้ชื่อไฟล์เดิม
    const fileExtension = slipFile.name.split(".").pop() // ดึงนามสกุลไฟล์
    const safeFileName = `payment_slips/${bookingId}/${Date.now()}_payment_slip.${fileExtension}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("payment_slips")
      .upload(safeFileName, slipFile, {
        cacheControl: "3600",
        upsert: true,
      })

    if (uploadError) throw uploadError

    // สร้าง URL สำหรับเข้าถึงไฟล์
    const {
      data: { publicUrl },
    } = supabase.storage.from("payment_slips").getPublicUrl(safeFileName)

    // อัปเดตวิธีการชำระเงิน
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        payment_method: "bank_transfer",
        payment_status: "pending",
      })
      .eq("id", bookingId)

    if (updateError) throw updateError

    // สร้างรายการชำระเงิน
    const { error: paymentError } = await supabase.from("payments").insert({
      booking_id: bookingId,
      amount: booking.total_price,
      payment_method: "bank_transfer",
      payment_status: "pending",
      slip_image_url: publicUrl,
      bank_name: bankName,
      account_number: accountNumber,
      transaction_date: transactionDate,
      notes: notes,
    })

    if (paymentError) throw paymentError

    // ดึงข้อมูลแคมป์เพื่อส่งการแจ้งเตือนให้เจ้าของแคมป์
    const { data: campsite, error: campsiteError } = await supabase
      .from("campsites")
      .select("owner_id, name")
      .eq("id", booking.campsite_id)
      .single()

    if (!campsiteError && campsite) {
      // สร้างการแจ้งเตือนสำหรับเจ้าของแคมป์
      await supabase.from("notifications").insert({
        user_id: campsite.owner_id,
        title: "มีการอัปโหลดสลิปการโอนเงิน",
        message: `ลูกค้าได้อัปโหลดสลิปการโอนเงินสำหรับการจอง ${campsite.name} กรุณาตรวจสอบและยืนยันการชำระเงิน`,
        type: "payment_slip_uploaded",
        reference_id: bookingId,
        is_read: false,
      })
    }

    revalidatePath(`/profile/booking/${bookingId}`)
    revalidatePath(`/admin/booking/${bookingId}`)
    return { success: true }
  } catch (error) {
    console.error("Error in uploadPaymentSlip:", error)
    return { success: false, error: error.message }
  }
}

/**
 * ดึงข้อมูลการชำระเงินตาม booking_id
 */
export async function getPaymentByBookingId(bookingId) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบ" }
    }

    // ดึงข้อมูลการจอง
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("user_id, campsite_id")
      .eq("id", bookingId)
      .single()

    if (bookingError) {
      console.error("Error fetching booking:", bookingError)
      return null
    }

    // ดึงข้อมูลแคมป์เพื่อตรวจสอบว่าเป็นเจ้าของแคมป์หรือไม่
    const { data: campsite, error: campsiteError } = await supabase
      .from("campsites")
      .select("owner_id")
      .eq("id", booking.campsite_id)
      .single()

    if (campsiteError) {
      console.error("Error fetching campsite:", campsiteError)
      return null
    }

    // ตรวจสอบสิทธิ์
    const isBookingOwner = booking.user_id === session.user.id
    const isCampsiteOwner = campsite.owner_id === session.user.id

    if (!isBookingOwner && !isCampsiteOwner) {
      console.error("User does not have permission to view payment")
      return null
    }

    // ดึงข้อมูลการชำระเงิน (แก้ไขส่วนนี้)
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) {
      console.error("Error fetching payment:", error)
      return null
    }

    if (!data || data.length === 0) {
      console.log("No payment data found for booking:", bookingId)
      return null
    }

    // ถ้ามี verified_by ให้ดึงข้อมูลผู้ยืนยันแยกต่างหาก
    const payment = data[0]
    if (payment.verified_by) {
      const { data: verifierData, error: verifierError } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", payment.verified_by)
        .single()

      if (!verifierError && verifierData) {
        payment.verified_by_user = verifierData
      }
    }

    console.log("Payment data from getPaymentByBookingId:", payment)
    return payment
  } catch (error) {
    console.error("Error in getPaymentByBookingId:", error)
    return null
  }
}

/**
 * ยืนยันการชำระเงิน (สำหรับเจ้าของแคมป์)
 */
export async function verifyPayment(paymentId, status, notes) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบ" }
    }

    // ดึงข้อมูลการชำระเงิน
    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("booking_id")
      .eq("id", paymentId)
      .single()

    if (fetchError) throw fetchError

    // ดึงข้อ��ูลการจอง
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("campsite_id, user_id")
      .eq("id", payment.booking_id)
      .single()

    if (bookingError) throw bookingError

    // ดึงข้อมูลแคมป์เพื่อตรวจสอบว่าเป็นเจ้าของแคมป์หรือไม่
    const { data: campsite, error: campsiteError } = await supabase
      .from("campsites")
      .select("owner_id, name")
      .eq("id", booking.campsite_id)
      .single()

    if (campsiteError) throw campsiteError

    // ตรวจสอบสิทธิ์
    if (campsite.owner_id !== session.user.id) {
      return { success: false, error: "คุณไม่มีสิทธิ์ยืนยันการชำระเงินนี้" }
    }

    // อัปเดตสถานะการชำระเงิน
    const { error: updatePaymentError } = await supabase
      .from("payments")
      .update({
        payment_status: status,
        verified_by: session.user.id,
        verified_at: new Date().toISOString(),
        notes: notes,
      })
      .eq("id", paymentId)

    if (updatePaymentError) throw updatePaymentError

    // อัปเดตสถานะการชำระเงินในการจอง
    const { error: updateBookingError } = await supabase
      .from("bookings")
      .update({
        payment_status: status,
      })
      .eq("id", payment.booking_id)

    if (updateBookingError) throw updateBookingError

    // สร้างการแจ้งเตือน
    const notificationType = status === "verified" ? "payment_verified" : "payment_rejected"
    const notificationTitle = status === "verified" ? "การชำระเงินได้รับการยืนยัน" : "การชำระเงินถูกปฏิเสธ"
    const notificationMessage =
      status === "verified"
        ? `การชำระเงินของคุณสำหรับการจอง ${campsite.name} ได้รับการยืนยันแล้ว`
        : `การชำระเงินของคุณสำหรับการจอง ${campsite.name} ถูกปฏิเสธ ${notes ? `เนื่องจาก: ${notes}` : ""}`

    // สร้างการแจ้งเตือนสำหรับผู้จอง
    await supabase.from("notifications").insert({
      user_id: booking.user_id,
      title: notificationTitle,
      message: notificationMessage,
      type: notificationType,
      reference_id: payment.booking_id,
      is_read: false,
    })

    revalidatePath(`/admin/booking/${payment.booking_id}`)
    revalidatePath(`/profile/booking/${payment.booking_id}`)
    return { success: true }
  } catch (error) {
    console.error("Error in verifyPayment:", error)
    return { success: false, error: error.message }
  }
}

export async function updateBankAccountFormData(formData) {
  try {
    const supabase = createClient(cookies)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบ" }
    }

    const { data, error } = await supabase
      .from("bank_accounts")
      .update({
        bank_name: formData.bank_name,
        account_name: formData.account_name,
        account_number: formData.account_number,
        is_default: formData.is_default,
      })
      .eq("id", formData.id)
      .eq("user_id", session.user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating bank account:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/profile")
    revalidatePath("/admin/finance")

    return { success: true, data }
  } catch (error) {
    console.error("Error in updateBankAccount:", error)
    return { success: false, error: error.message }
  }
}

export async function addBankAccountFormData(formData) {
  try {
    const supabase = createClient(cookies)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบ" }
    }

    const { data, error } = await supabase
      .from("bank_accounts")
      .insert({
        user_id: session.user.id,
        bank_name: formData.bank_name,
        account_name: formData.account_name,
        account_number: formData.account_number,
        is_default: formData.is_default,
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding bank account:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/profile")
    revalidatePath("/admin/finance")

    return { success: true, data }
  } catch (error) {
    console.error("Error in addBankAccount:", error)
    return { success: false, error: error.message }
  }
}
