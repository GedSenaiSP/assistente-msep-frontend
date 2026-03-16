"use client"

import { SidebarContent, SidebarMenu } from "@/components/ui/sidebar"
import { useApp } from "@/contexts/app-context"
import { ChatMenuItem } from "./chat-menu-item"
import { PlanMenuItem } from "./plan-menu-item"
import { AdminMenuItem } from "./admin-menu-item"
import { SettingsMenuItem } from "./settings-menu-item"
import { MessageCircle, Bug } from "lucide-react"

export function AppSidebar() {
  const { userRole } = useApp()

  const feedbackFormUrl = process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL
  const bugReportFormUrl = process.env.NEXT_PUBLIC_BUG_REPORT_FORM_URL

  return (
    <SidebarContent className="flex flex-col h-full">
      <SidebarMenu>
        <ChatMenuItem />
        <PlanMenuItem />
        {(userRole === "administracao_regional" || userRole === "administracao_nacional" || userRole === "coordenador") && <AdminMenuItem />}
        <SettingsMenuItem />

        <div className="flex-1"></div>

        <div className="p-4 space-y-2">
          <a
            href={feedbackFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-2 text-sm font-medium rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <MessageCircle className="h-5 w-5 mr-3" />
            Feedback
          </a>
          <a
            href={bugReportFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-2 text-sm font-medium rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Bug className="h-5 w-5 mr-3" />
            Reportar Bug
          </a>
        </div>
      </SidebarMenu>
    </SidebarContent>
  )
}
