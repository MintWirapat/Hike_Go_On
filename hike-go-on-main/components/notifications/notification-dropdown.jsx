"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { timeAgo } from "@/lib/utils/date-utils"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function NotificationDropdown({ userId }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const dropdownOpenRef = useRef(false)

  const markAllAsRead = useCallback(async () => {
    if (!userId || unreadCount === 0) return

    try {
      // อัปเดต state ในแอปก่อนเพื่อให้ UI ตอบสนองทันที
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) => ({
          ...notification,
          is_read: true,
        })),
      )
      setUnreadCount(0)

      // อัปเดตสถานะการอ่านในฐานข้อมูล
      const supabase = await createClient()
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false)
    } catch (error) {
      console.error("Error marking notifications as read:", error)
      // หากเกิดข้อผิดพลาด ให้ดึงข้อมูลใหม่เพื่อให้ state ตรงกับฐานข้อมูล
      const supabase = await createClient()
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5)

      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter((notification) => !notification.is_read).length)
      }
    }
  }, [userId, unreadCount])

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!userId) return

      try {
        setLoading(true)
        const supabase = await createClient()

        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5)

        if (error) {
          console.error("Error fetching notifications:", error)
          return
        }

        setNotifications(data || [])

        const unread = data.filter((notification) => !notification.is_read).length
        setUnreadCount(unread)
      } catch (error) {
        console.error("Error in fetchNotifications:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()

    // ตั้งค่า Realtime subscription
    const setupRealtimeSubscription = async () => {
      try {
        const supabase = await createClient()

        // สร้าง subscription สำหรับตาราง notifications
        const subscription = supabase
          .channel("notifications-changes")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              // เมื่อมีการแจ้งเตือนใหม่
              const newNotification = payload.new

              // เพิ่มการแจ้งเตือนใหม่ไว้ที่ด้านบนของรายการ
              setNotifications((prevNotifications) => [newNotification, ...prevNotifications].slice(0, 5))

              // เพิ่มจำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
              setUnreadCount((prev) => prev + 1)
            },
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              // เมื่อมีการอัปเดตการแจ้งเตือน
              const updatedNotification = payload.new

              // อัปเดตการแจ้งเตือนในรายการ
              setNotifications((prevNotifications) =>
                prevNotifications.map((notification) =>
                  notification.id === updatedNotification.id ? updatedNotification : notification,
                ),
              )

              // อัปเดตจำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
              const calculateUnread = () => {
                return notifications.filter((notification) => !notification.is_read).length
              }

              setUnreadCount(calculateUnread())
            },
          )
          .subscribe()

        // เก็บ subscription ไว้เพื่อ cleanup
        return subscription
      } catch (error) {
        console.error("Error setting up realtime subscription:", error)
        return null
      }
    }

    // ตั้งค่า subscription และเก็บไว้เพื่อ cleanup
    let subscription
    setupRealtimeSubscription().then((sub) => {
      subscription = sub
    })

    // Cleanup subscription เมื่อ component unmount
    return () => {
      const cleanupSubscription = async () => {
        if (subscription) {
          try {
            const supabase = await createClient()
            supabase.removeChannel(subscription)
          } catch (error) {
            console.error("Error removing subscription:", error)
          }
        }
      }

      cleanupSubscription()
    }
  }, [userId, router])

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && !dropdownOpenRef.current) {
          markAllAsRead()
        }
        dropdownOpenRef.current = open
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-xs"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2 border-b">
          <h3 className="font-medium">การแจ้งเตือน</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">กำลังโหลด...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">ไม่มีการแจ้งเตือน</div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} className="p-3 cursor-pointer">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{notification.title}</h4>
                    <span className="text-xs text-gray-500">{timeAgo(notification.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <div className="p-2 border-t text-center">
          <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-800 w-full">
            ดูทั้งหมด
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
