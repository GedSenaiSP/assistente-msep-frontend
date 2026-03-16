"use client"

import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
import { Settings } from "lucide-react"
import { useApp } from "@/contexts/app-context"

export function SettingsMenuItem() {
  const { activeView, setActiveView, conversations } = useApp()

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={activeView === "settings"}
        onClick={() => {
          setActiveView("settings")
          conversations.setActiveConversationId(null)
        }}
      >
        <Settings className="h-5 w-5 mr-3 text-primary" />
        <span className={activeView === "settings" ? "text-primary" : ""}>Configurações</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
