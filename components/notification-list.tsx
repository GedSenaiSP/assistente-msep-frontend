"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CheckCircle, AlertCircle, FileText, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Notification {
    id: string
    type: string
    message: string
    is_read: boolean
    created_at: string
    plan_id?: string
    metadata?: any
}

interface NotificationListProps {
    onNotificationRead: () => void
    onPlanClick?: (planId: string) => void
}

export function NotificationList({ onNotificationRead, onPlanClick }: NotificationListProps) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const { data: session } = useSession()

    useEffect(() => {
        if (session?.user?.id) {
            fetchNotifications()
        }
    }, [session])

    const fetchNotifications = async () => {
        try {
            setLoading(true)
            const userId = session?.user?.id
            if (!userId) return

            const response = await fetch(
                `/api/proxy/notifications?user_id=${userId}&limit=20`
            )
            if (response.ok) {
                const data = await response.json()
                setNotifications(data.notifications)
            }
        } catch (error) {
            console.error("Erro ao buscar notificações:", error)
        } finally {
            setLoading(false)
        }
    }

    const markAsRead = async (notificationId: string) => {
        try {
            const userId = session?.user?.id
            if (!userId) return

            const response = await fetch(
                `/api/proxy/notifications/mark-read?user_id=${userId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ notification_ids: [notificationId] }),
                }
            )
            if (response.ok) {
                setNotifications(prev =>
                    prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
                )
                onNotificationRead()
            }
        } catch (error) {
            console.error("Erro ao marcar notificação como lida:", error)
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case "plan_submitted":
                return <FileText className="h-5 w-5 text-blue-500" />
            case "plan_approved":
                return <CheckCircle className="h-5 w-5 text-green-500" />
            case "plan_returned":
                return <AlertCircle className="h-5 w-5 text-orange-500" />
            default:
                return <FileText className="h-5 w-5 text-gray-500" />
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        )
    }

    if (notifications.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Nenhuma notificação
            </div>
        )
    }

    return (
        <div>
            <div className="p-3 border-b">
                <h3 className="font-semibold">Notificações</h3>
            </div>
            <ScrollArea className="h-96">
                <div className="space-y-1 p-2">
                    {notifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${notification.is_read
                                ? "bg-background hover:bg-muted/50"
                                : "bg-muted/50 hover:bg-muted"
                                }`}
                            onClick={() => {
                                if (!notification.is_read) markAsRead(notification.id)
                                if (notification.plan_id && onPlanClick) onPlanClick(notification.plan_id)
                            }}
                        >
                            <div className="flex-shrink-0 mt-0.5">
                                {getIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{notification.message}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(new Date(notification.created_at), {
                                        addSuffix: true,
                                        locale: ptBR,
                                    })}
                                </p>
                            </div>
                            {!notification.is_read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}
