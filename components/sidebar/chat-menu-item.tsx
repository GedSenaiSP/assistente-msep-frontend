"use client"

import { Button } from "@/components/ui/button"
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  PlusCircle,
  Trash2,
  Loader2,
} from "lucide-react"
import { useApp } from "@/contexts/app-context"
import { useRef, useEffect } from "react"

export function ChatMenuItem() {
  const {
    activeView,
    setActiveView,
    isChatListExpanded,
    setIsChatListExpanded,
    conversations: {
      conversations,
      activeConversationId,
      setActiveConversationId,
      createNewConversation,
      openDeleteDialog,
      openRenameDialog,
      isLoadingConversations,
      loadConversationContent,
      deleteConversation, // Adicionando acesso direto à função deleteConversation
    },
  } = useApp()

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeConversationId && scrollRef.current) {
      const activeElement = scrollRef.current.querySelector(
        `[data-conversation-id="${activeConversationId}"]`
      )
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }
    }
  }, [activeConversationId, conversations])

  // Função para lidar com o clique em uma conversa
  const handleConversationClick = (conversationId: string, threadId?: string) => {
    setActiveConversationId(conversationId)
    setActiveView("chat")

    // Se a conversa tiver um threadId e não tiver mensagens, carregar o conteúdo
    const conversation = conversations.find((c) => c.id === conversationId)
    if (conversation && threadId && (!conversation.messages || conversation.messages.length === 0)) {
      loadConversationContent(conversationId, threadId)
    }
  }

  // Função para lidar com a exclusão de uma conversa
  const handleDeleteConversation = (conversationId: string) => {
    console.log("handleDeleteConversation chamado com id:", conversationId)
    // Chamar diretamente deleteConversation em vez de openDeleteDialog
    if (confirm("Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita.")) {
      console.log("Confirmação aceita, chamando deleteConversation")
      deleteConversation(conversationId)
    }
  }

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={activeView === "chat"}
          onClick={() => {
            setIsChatListExpanded(!isChatListExpanded)
            if (activeView !== "chat" && activeConversationId) {
              setActiveView("chat")
            }
          }}
        >
          <MessageCircle className="h-5 w-5 mr-3 text-primary" />
          <span className={activeView === "chat" ? "text-primary" : ""}>Chatbot</span>
          <div className="ml-auto">
            {isChatListExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>

      {/* Submenu de conversas */}
      {isChatListExpanded && (
        <div className="pl-8 mt-1 space-y-1 w-full">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sm font-normal hover:bg-msep-blue/10 hover:text-primary"
            onClick={() => {
              createNewConversation()
              setActiveView("chat")
            }}
          >
            <PlusCircle className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
            <span className="truncate">Nova Conversa</span>
          </Button>

          {isLoadingConversations ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">Carregando conversas...</span>
            </div>
          ) : (
            <div ref={scrollRef} className="max-h-60 overflow-y-auto pr-2 w-full">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  data-conversation-id={conversation.id}
                  className="group relative w-full"
                >
                  <div
                    className={`flex items-center w-full rounded-md mb-1 px-2 py-1.5 text-sm ${activeConversationId === conversation.id
                        ? "bg-msep-blue/10 border-l-2 border-msep-blue"
                        : "hover:bg-muted/50"
                      }`}
                  >
                    <button
                      className="flex items-center flex-grow min-w-0 focus:outline-none"
                      onClick={() => handleConversationClick(conversation.id, conversation.threadId)}
                    >
                      <MessageSquare
                        className={`h-4 w-4 mr-2 flex-shrink-0 ${activeConversationId === conversation.id ? "text-primary" : ""
                          }`}
                      />
                      <span
                        className={`truncate ${activeConversationId === conversation.id ? "text-primary font-medium" : ""
                          }`}
                      >
                        {conversation.title}
                      </span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full flex-shrink-0 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            openRenameDialog(conversation.id, conversation.title)
                          }}
                        >
                          <Edit2 className="h-4 w-4 mr-2 text-primary" />
                          <span className="text-primary">Renomear</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive opacity-50 cursor-not-allowed"
                          disabled
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
