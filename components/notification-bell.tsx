"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { NotificationList } from "./notification-list"

interface NotificationBellProps {
    onPlanClick?: (planId: string) => void
}

export function NotificationBell({ onPlanClick }: NotificationBellProps = {}) {
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const { data: session } = useSession()

    // Polling para buscar contagem de não lidas
    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const token = session?.accessToken
                const userId = session?.user?.id
                console.log("🔔 [NotificationBell] Tentando buscar notificações...")
                console.log("🔔 Session:", session ? "✅ Existe" : "❌ Não encontrada")
                console.log("🔔 User ID:", userId)
                console.log("🔔 Token:", token ? "✅ Existe" : "❌ Não encontrado")

                if (!userId) {
                    console.log("🔔 Abortando: sem user_id")
                    return
                }

                const url = `/api/proxy/notifications?user_id=${userId}&unread_only=true&limit=1`
                console.log("🔔 URL:", url)

                const response = await fetch(url)

                console.log("🔔 Response status:", response.status)

                if (response.ok) {
                    const data = await response.json()
                    console.log("🔔 Dados recebidos:", data)
                    setUnreadCount(data.unread_count)
                } else {
                    console.error("🔔 Erro na resposta:", await response.text())
                }
            } catch (error) {
                console.error("🔔 Erro ao buscar notificações:", error)
            }
        }

        console.log("🔔 [NotificationBell] useEffect disparado, session:", session ? "presente" : "ausente")

        if (session?.user?.id) {
            fetchUnreadCount()
            // Polling a cada 60 segundos
            const interval = setInterval(fetchUnreadCount, 60000)
            return () => clearInterval(interval)
        }
    }, [session])

    const handlePlanClick = (planId: string) => {
        setIsOpen(false) // Fecha o dropdown
        if (onPlanClick) {
            onPlanClick(planId) // Chama o callback do parent
        }
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-muted">
                    <Bell className="h-5 w-5 text-msep-blue" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 p-0">
                <NotificationList
                    onNotificationRead={() => setUnreadCount(prev => Math.max(0, prev - 1))}
                    onPlanClick={handlePlanClick}
                />
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
