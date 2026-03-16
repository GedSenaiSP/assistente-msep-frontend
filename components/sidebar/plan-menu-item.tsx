"use client"

import { Button } from "@/components/ui/button"
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
import { ChevronDown, ChevronUp, Edit2, FileText, Save, Settings } from "lucide-react"
import { useApp } from "@/contexts/app-context"

export function PlanMenuItem() {
  const { activeView, setActiveView, isPlanMenuExpanded, setIsPlanMenuExpanded, conversations } = useApp()

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => setIsPlanMenuExpanded(!isPlanMenuExpanded)}
          isActive={activeView === "plan-generator" || activeView === "plan-saved" || activeView === "plan-manual"}
        >
          <FileText className="h-5 w-5 mr-3 text-primary" />
          <span
            className={activeView.includes("plan") ? "text-primary font-medium whitespace-nowrap" : "whitespace-nowrap"}
          >
            Assistente de Plano de Ensino
          </span>
          <div className="ml-auto">
            {isPlanMenuExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>

      {/* Submenus que aparecem quando o menu principal é expandido */}
      {isPlanMenuExpanded && (
        <div className="pl-8 mt-1 space-y-1 w-full">
          {/* Submenu Gerador de Planos de Ensino */}
          <Button
            variant="ghost"
            size="sm"
            className={`w-full justify-start text-sm font-normal ${activeView === "plan-generator"
                ? "bg-msep-blue/10 border-l-2 border-msep-blue text-primary"
                : "hover:bg-msep-blue/5 hover:text-primary"
              }`}
            onClick={() => {
              setActiveView("plan-generator")
              conversations.setActiveConversationId(null)
            }}
          >
            <Settings
              className={`h-4 w-4 mr-2 flex-shrink-0 ${activeView === "plan-generator" ? "text-primary" : ""}`}
            />
            <span className="truncate whitespace-nowrap">Gerador de Planos de Ensino</span>
          </Button>

          {/* Novo submenu Criar Plano de Ensino Manual */}
          {/* <Button
            variant="ghost"
            size="sm"
            className={`w-full justify-start text-sm font-normal ${activeView === "plan-manual"
                ? "bg-msep-blue/10 border-l-2 border-msep-blue text-primary"
                : "hover:bg-msep-blue/5 hover:text-primary"
              }`}
            onClick={() => setActiveView("plan-manual")}
          >
            <Edit2 className={`h-4 w-4 mr-2 flex-shrink-0 ${activeView === "plan-manual" ? "text-primary" : ""}`} />
            <span className="truncate whitespace-nowrap">Criar Plano de Ensino Manual</span>
          </Button> */}
          {/* Submenu Planos de Ensino Salvos */}
          <Button
            variant="ghost"
            size="sm"
            className={`w-full justify-start text-sm font-normal ${activeView === "plan-saved"
                ? "bg-msep-blue/10 border-l-2 border-msep-blue text-primary"
                : "hover:bg-msep-blue/5 hover:text-primary"
              }`}
            onClick={() => setActiveView("plan-saved")}
          >
            <Save className={`h-4 w-4 mr-2 flex-shrink-0 ${activeView === "plan-saved" ? "text-primary" : ""}`} />
            <span className="truncate whitespace-nowrap">Planos de Ensino Salvos</span>
          </Button>
        </div>
      )}
    </>
  )
}
