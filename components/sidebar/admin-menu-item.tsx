"use client"

import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
import { Users } from "lucide-react"
import { useApp } from "@/contexts/app-context"

export function AdminMenuItem() {
  const { activeView, setActiveView, conversations } = useApp()

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={activeView === "admin"}
        onClick={() => {
          setActiveView("admin")
          conversations.setActiveConversationId(null)
        }}
      >
        <Users className="h-5 w-5 mr-3 text-primary" />
        <span className={activeView === "admin" ? "text-primary" : ""}>Administração</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
