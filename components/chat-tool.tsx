"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle, FileText, Edit } from "lucide-react"
import type { Conversation, Message } from "@/hooks/use-conversations"
import { sendChatMessage, generateThreadId, sendChatMessageWithFiles } from "@/services/api"
import { ChatInterface, type ChatMessage } from "./chat-interface"
import { useSession } from "next-auth/react"
import { Skeleton } from "@/components/ui/skeleton"

interface ChatToolProps {
  conversations: Conversation[]
  activeConversationId: string
  setActiveConversationId: (id: string) => void
  createNewConversation: () => void
  deleteConversation: (id: string) => void
  renameConversation: (id: string, newTitle: string) => void
  updateConversationTitle: (id: string, newTitle: string) => void
  addMessageToConversation: (conversationId: string, message: Omit<Message, "id">) => void
  onNavigateToPlans: () => void
  onNavigateToManualPlan: () => void
}

export function ChatTool({
  conversations,
  activeConversationId,
  setActiveConversationId,
  createNewConversation,
  deleteConversation,
  renameConversation,
  updateConversationTitle,
  addMessageToConversation,
  onNavigateToPlans,
  onNavigateToManualPlan,
}: ChatToolProps) {
  const [isLoading, setIsLoading] = useState(false)
  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null
  const { data: session, status } = useSession()
  const userName = session?.user?.name || "visitante"
  // Obter o ID do usuário da sessão
  const userId = session?.user?.id || "anonymous"

  const handleSendMessage = async (message: string, files?: File[]) => {
    if (!activeConversation) return

    const hasFiles = files && files.length > 0
    const isMessageEmpty = message.trim() === ""

    if (!hasFiles && isMessageEmpty) return // Não envia se não há mensagem nem arquivos

    // Obter ou gerar threadId para a conversa
    const threadId = activeConversation.threadId || generateThreadId()

    // Preparar a mensagem do usuário para exibição no chat
    const fileInfo = hasFiles ? `\nArquivos anexados: ${files.map((f) => f.name).join(", ")}` : ""
    const userMessageContent = `${message}${fileInfo}`

    // Adicionar mensagem do usuário à conversa
    addMessageToConversation(activeConversationId, {
      role: "user",
      content: userMessageContent,
      timestamp: new Date(),
      threadId,
    })

    setIsLoading(true)

    try {
      let response;
      if (hasFiles) {
        response = await sendChatMessageWithFiles(message, files, threadId, userId);
      } else {
        response = await sendChatMessage(userMessageContent, threadId, userId);
      }

      // Adicionar resposta do assistente
      addMessageToConversation(activeConversationId, {
        role: "assistant",
        content: response.message,
        timestamp: new Date(),
        threadId: response.threadId || threadId,
      })

      // Atualizar o título da conversa se um título for fornecido na resposta
      if (response.title && response.title.trim() !== "") {
        updateConversationTitle(activeConversationId, response.title.trim())
      }
    } catch (error) {
      console.error("Erro ao processar mensagem:", error)

      // Adicionar mensagem de erro
      addMessageToConversation(activeConversationId, {
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente mais tarde.",
        timestamp: new Date(),
        threadId,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Converter mensagens para o formato esperado pelo ChatInterface
  const mapMessages = (messages: Message[] = []): ChatMessage[] => {
    return messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
    }))
  }

  return (
    <div className="flex flex-col h-full">
      {activeConversation ? (
        <>
          <div className="p-4 bg-primary/5 border-b">
            <h2 className="text-lg font-medium text-primary">{activeConversation.title}</h2>
            <p className="text-sm text-muted-foreground">
              Converse com o assistente para tirar dúvidas sobre a metodologia SENAI, ou peça alterações em um plano de ensino gerado pelo assistente.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            <ChatInterface
              messages={mapMessages(activeConversation.messages)}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              placeholder="Digite sua pergunta sobre a metodologia MSEP..."
              showFileUpload={true}
              messageAlignment="mixed"
              className="h-full"
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <div className="max-w-md text-center">
            <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#e30613] to-[#681413] text-transparent bg-clip-text">
              {status === "loading" ? <Skeleton className="h-12 w-48 mx-auto" /> : `Olá, ${userName}`}
            </h2>
            <p className="mb-6 text-muted-foreground">
              Converse com o assistente para tirar dúvidas sobre a Metodologia SENAI de Educação Profissional ou use o assistente para gerar planos de ensino personalizados.
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={createNewConversation} className="bg-primary w-full">
                <PlusCircle className="h-4 w-4 mr-2" />
                Iniciar Nova Conversa
              </Button>
              <Button onClick={onNavigateToPlans} className="bg-primary w-full">
                <FileText className="h-4 w-4 mr-2" />
                Gerar Planos de Ensino
              </Button>
              {/*<Button onClick={onNavigateToManualPlan} className="bg-primary w-full">
                <Edit className="h-4 w-4 mr-2" />
                Criar Plano de Ensino Manual
              </Button>*/}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
