'use client'

import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
import { FilePlus2 } from "lucide-react"
import { useApp } from "@/contexts/app-context"

export function ManualPlanMenuItem() {
  const { activeView, setActiveView, conversations } = useApp()

  return (
    <SidebarMenuItem className="pl-8">
      <SidebarMenuButton
        isActive={activeView === "plan-manual"}
        onClick={() => {
          setActiveView("plan-manual")
          conversations.setActiveConversationId(null)
        }}
      >
        <FilePlus2 className="h-5 w-5 mr-3 text-primary" />
        <span className={activeView === "plan-manual" ? "text-primary" : ""}>Criação Manual</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
