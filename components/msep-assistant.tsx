"use client"

import { Header } from "@/components/header"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { MainContent } from "@/components/main-content"
import { useApp } from "@/contexts/app-context"
import { useState } from "react"

// Interface for situations of aprendizagem
export interface LearningActivity {
  id: string
  type: string
  description: string
  context?: string
  challenge?: string
  expectedResults?: string
}

// Interface para planos de ensino
export interface TeachingPlan {
  id: string
  title: string
  unit: string
  duration: string
  objectives: string[]
  learningActivities: LearningActivity[]
  evaluation: string
  resources: string[]
  createdAt: Date
  lastModified: Date
  course?: string
  className?: string
  module?: string
  unitHours?: string
  strategyHours?: string
  classesCount?: string
  unitObjective?: string
  teachingMode?: string
  teacher?: string
  school?: string
  capacities?: any[]
  knowledge?: any[]
  evaluationCriteria?: any[]
  classPlans?: any[]
  completeStrategies?: any[]
}

// Interface para mensagens
export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  threadId?: string // Opcional para armazenar o threadId retornado pela API
}

export interface Conversation {
  id: string
  title: string
  date: string
  lastMessage?: string
  messages: Message[]
  threadId?: string
}

export function MsepAssistant() {
  const isMobile = useIsMobile()
  const { conversations, activeView, setActiveView } = useApp()
  const [planIdToSelect, setPlanIdToSelect] = useState<string | null>(null)

  const handlePlanClick = (planId: string) => {
    setPlanIdToSelect(planId)
    setActiveView("plan-saved") // Navega para a view de planos salvos
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <SidebarProvider defaultOpen={!isMobile}>
        <Header
          activeView={activeView}
          isMobile={isMobile}
          createNewConversation={conversations.createNewConversation}
          onPlanClick={handlePlanClick}
        />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar collapsible="offcanvas" className="w-80 md:w-72 flex-shrink-0 border-r border-border/30">
            <AppSidebar />
          </Sidebar>

          <SidebarInset>
            <MainContent
              planIdToSelect={planIdToSelect}
              onPlanSelected={() => setPlanIdToSelect(null)}
            />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
