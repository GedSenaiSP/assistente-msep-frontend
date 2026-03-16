"use client"

import { createContext, useContext, useState, useEffect, type ReactNode, useRef } from "react"
import { useSession } from "next-auth/react"
import { useConversations } from "@/hooks/use-conversations"
import { usePlans } from "@/hooks/use-plans"
import { getUserRole, upsertUser, User } from "@/services/api"
import { RoleSelectionDialog } from "@/components/role-selection-dialog"
import { toast } from "@/hooks/use-toast"

type ViewType = "chat" | "plan-generator" | "plan-saved" | "plan-manual" | "settings" | "admin"

interface AppContextType {
  activeView: ViewType
  setActiveView: (view: ViewType) => void
  isChatListExpanded: boolean
  setIsChatListExpanded: (expanded: boolean) => void
  isPlanMenuExpanded: boolean
  setIsPlanMenuExpanded: (expanded: boolean) => void
  conversations: ReturnType<typeof useConversations>
  plans: ReturnType<typeof usePlans>
  model: string
  setModel: (model: string) => void
  temperature: number
  setTemperature: (temperature: number) => void
  topP: number
  setTopP: (topP: number) => void
  topK: number
  setTopK: (topK: number) => void
  resetPlanState: () => void
  isProcessing: boolean
  setIsProcessing: (isProcessing: boolean) => void
  processingMessage: string
  setProcessingMessage: (message: string) => void
  switchToConversation: (threadId: string) => void
  userRole: User["role"] | null
  userSchool: string | null
}

const AppContext = createContext<AppContextType | undefined>(undefined)

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>()
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<ViewType>("chat")
  const [isChatListExpanded, setIsChatListExpanded] = useState(false)
  const [isPlanMenuExpanded, setIsPlanMenuExpanded] = useState(false)
  const [model, setModel] = useState("gemini-2.5-flash")
  const [temperature, setTemperature] = useState(0.7)
  const [topP, setTopP] = useState(0.9)
  const [topK, setTopK] = useState(40)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingMessage, setProcessingMessage] = useState("")
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [userRole, setUserRole] = useState<User["role"] | null>(null)
  const [userSchool, setUserSchool] = useState<string | null>(null)

  const { data: session, status } = useSession()

  const handleConversationsLoaded = (hasConversations: boolean) => {
    if (hasConversations) {
      setIsChatListExpanded(true)
    }
  }

  const conversations = useConversations([], handleConversationsLoaded)
  const plans = usePlans()
  const prevActiveView = usePrevious(activeView)

  useEffect(() => {
    const checkUserRole = async () => {
      if (status === "authenticated" && session?.user?.id && !userRole) {
        try {
          const roleResponse = await getUserRole(session.user.id)
          // Se o usuário não for encontrado (404) ou não tiver uma função, abra o diálogo.
          if (!roleResponse || !roleResponse.role) {
            // Não criamos mais o usuário aqui. Apenas abrimos o diálogo para pedir a função.
            // O usuário será criado com a função em handleSaveRole.
            setIsRoleDialogOpen(true)
          } else {
            setUserRole(roleResponse.role)
            // Tenta obter a escola do usuário da sessão, se disponível
            if (session.user.escola) {
              setUserSchool(session.user.escola)
            }
          }
        } catch (error) {
          console.error("Failed to check user role:", error)
          toast({
            title: "Erro de Verificação",
            description: "Não foi possível verificar os dados do usuário. Tente recarregar a página.",
            variant: "destructive",
          })
        }
      }
    }

    checkUserRole()
  }, [status, session, userRole])

  const handleSaveRole = async (data: { role: User["role"]; department: string; school: string }) => {
    if (session?.user?.id) {
      try {
        await upsertUser({
          user_id: session.user.id,
          full_name: `${session.user.name} ${session.user.family_name}`,
          email: session.user.email,
          role: data.role,
          departamento_regional: data.department,
          escola: data.school,
        })
        setUserRole(data.role)
        setUserSchool(data.school) // Define a escola também
        setIsRoleDialogOpen(false)
        toast({
          title: "Cadastro Completo!",
          description: "Seus dados foram salvos com sucesso.",
        })
      } catch (error) {
        toast({
          title: "Erro ao Salvar",
          description: "Não foi possível salvar seus dados. Tente novamente.",
          variant: "destructive",
        })
      }
    }
  }

  const resetPlanState = () => {
    plans.setTeacherName("")
    plans.setSchool("")
    plans.setCourseName("")
    plans.setUnit("")
    plans.setTechnicalCapabilities([])
    plans.setSocialCapabilities([])
    plans.setLearningActivities([])
    plans.setSchedule([])
  }

  useEffect(() => {
    if (conversations.conversations.length > 0) {
      setIsChatListExpanded(true)
    }
  }, [conversations.conversations.length])

  useEffect(() => {
    if (prevActiveView === "plan-generator" && activeView !== "plan-generator") {
      resetPlanState()
    }
  }, [activeView, prevActiveView])

  const switchToConversation = (threadId: string) => {
    conversations.setActiveConversationId(threadId)
    setActiveView("chat")
  }

  return (
    <AppContext.Provider
      value={{
        activeView,
        setActiveView,
        isChatListExpanded,
        setIsChatListExpanded,
        isPlanMenuExpanded,
        setIsPlanMenuExpanded,
        conversations,
        plans,
        model,
        setModel,
        temperature,
        setTemperature,
        topP,
        setTopP,
        topK,
        setTopK,
        resetPlanState,
        isProcessing,
        setIsProcessing,
        processingMessage,
        setProcessingMessage,
        switchToConversation,
        userRole,
        userSchool,
      }}
    >
      {children}
      <RoleSelectionDialog isOpen={isRoleDialogOpen} onSave={handleSaveRole} />
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}
