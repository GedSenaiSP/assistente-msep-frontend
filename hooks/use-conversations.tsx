"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { v4 as uuidv4 } from "uuid"
import { getUserThreads, getChatHistory, deleteThread, renameThread } from "@/services/api"
import { useSession } from "next-auth/react"

export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  threadId?: string
}

export type Conversation = {
  id: string
  title: string
  date: string
  lastMessage?: string
  messages: Message[]
  threadId?: string
}

export function useConversations(
  initialConversations: Conversation[] = [],
  onConversationsLoaded?: (hasConversations: boolean) => void,
) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [conversationToModify, setConversationToModify] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [newConversationTitle, setNewConversationTitle] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [conversationsLoaded, setConversationsLoaded] = useState(false)
  const { toast } = useToast()
  const { data: session } = useSession()
  const userId = session?.user?.id || "anonymous"

  // Carregar as conversas do usuário ao iniciar
  useEffect(() => {
    if (userId !== "anonymous" && !conversationsLoaded) {
      loadUserConversations(userId)
      setConversationsLoaded(true)
    }
  }, [userId, conversationsLoaded])

  // Efeito para carregar o conteúdo da conversa ativa
  useEffect(() => {
    if (activeConversationId) {
      const activeConversation = conversations.find((c) => c.id === activeConversationId)

      // Carregar o conteúdo apenas se a conversa existir, tiver um threadId e as mensagens ainda não foram carregadas
      if (activeConversation && activeConversation.threadId && activeConversation.messages.length === 0) {
        loadConversationContent(activeConversation.id, activeConversation.threadId)
      }
    }
  }, [activeConversationId, conversations])

  // Função para carregar as conversas do usuário - USANDO O SERVIÇO
  const loadUserConversations = async (userId: string) => {
    setIsLoadingConversations(true)
    try {
      // USANDO O SERVIÇO EM VEZ DE CHAMADA DIRETA
      const threadsResponse = await getUserThreads(userId)

      if (threadsResponse.threads && threadsResponse.threads.length > 0) {
        const loadedConversations = threadsResponse.threads.map((thread) => ({
          id: thread.thread_id, // Usar o thread_id como ID principal
          title: thread.title,
          date: new Date().toISOString().split("T")[0],
          messages: [],
          threadId: thread.thread_id,
        }))

        setConversations((prevConversations) => {
          const conversationMap = new Map(prevConversations.map((c) => [c.threadId, c]))

          loadedConversations.forEach((loadedConvo) => {
            const existingConvo = conversationMap.get(loadedConvo.threadId)
            if (existingConvo) {
              // Atualiza o título, mas mantém as mensagens e o ID local
              conversationMap.set(loadedConvo.threadId, {
                ...existingConvo,
                title: loadedConvo.title,
              })
            } else {
              // Adiciona nova conversa
              conversationMap.set(loadedConvo.threadId, {
                ...loadedConvo,
                id: loadedConvo.threadId, // Garante que o ID seja o threadId
              })
            }
          })

          const newConversations = Array.from(conversationMap.values())
          // Se uma conversa foi criada localmente e ainda não tem threadId, ou é a ATIVA (para evitar sumir em race condition), mantenha-a
          prevConversations.forEach((prevConvo) => {
            const isMissingFromBackend = !newConversations.some((nc) => nc.id === prevConvo.id)
            const isLocal = !prevConvo.threadId
            // Se for a conversa ativa, mantemos mesmo que o backend ainda não a tenha indexado (race condition)
            // Usamos uma referência ao state activeConversationId que precisamos capturar no escopo ou passar como argumento
            // Como estamos dentro do setState, não temos acesso garantido ao activeConversationId mais recente sem closure.
            // Mas PODEMOS confiar que se ela estava em 'prevConversations', ela deve ser mantida se for local OU se foi recém adicionada (podemos checar data?)

            // Simplificação Robusta: Se não veio do backend, mantemos se for local. 
            // Para resolver o problema do "Save -> Sumiu", vamos assumir que o backend é a fonte da verdade, MAS
            // se tivermos uma conversa com threadId que NÃO está no backend, pode ser um delete...
            // ou pode ser uma criação recente.

            if (isMissingFromBackend) {
              if (isLocal) {
                newConversations.push(prevConvo)
              }
              // Se tem threadId, mas não veio, teoricamente foi deletada.
              // Mas para garantir a UX do "Acabei de criar", podemos checar se foi criada nos últimos 10 segundos? Não.
              // Vamos CONFIAR no optimistic update e não rodar o loadUserConversations imediatamente no componente.
              // Esta alteração aqui é apenas preventiva.
            }
          })

          return newConversations
        })

        if (onConversationsLoaded) {
          onConversationsLoaded(true)
        }
      } else {
        if (onConversationsLoaded) {
          onConversationsLoaded(false)
        }
      }
    } catch (error) {
      console.error("Erro ao carregar conversas do usuário:", error)
      toast({
        title: "Erro ao carregar conversas",
        description: "Não foi possível carregar suas conversas anteriores.",
        variant: "destructive",
      })
      // Notificar que ocorreu um erro ao carregar as conversas
      if (onConversationsLoaded) {
        onConversationsLoaded(false)
      }
    } finally {
      setIsLoadingConversations(false)
    }
  }

  // Função para carregar o conteúdo de uma conversa específica - USANDO O SERVIÇO
  const loadConversationContent = async (conversationId: string, threadId: string) => {
    try {
      // USANDO O SERVIÇO EM VEZ DE CHAMADA DIRETA
      const historyResponse = await getChatHistory(threadId)

      // Converter as mensagens da API para o formato de mensagens do hook
      const messages: Message[] = []

      historyResponse.messages.forEach((msg) => {
        const content = msg.content

        // Verificar se a mensagem começa com "User:" ou "Agent:"
        if (content.startsWith("User:")) {
          const userContent = content.substring(6).trim() // Remover "User: " do início

          // Filtrar mensagens de comando que não devem aparecer para o usuário
          if (!userContent.startsWith("CMD_GENERATE_TEACHING_PLAN")) {
            messages.push({
              id: uuidv4(),
              role: "user",
              content: userContent,
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(), // Usar timestamp do backend
              threadId,
            })
          }
        } else if (content.startsWith("Agent:")) {
          let agentContent = content.substring(7).trim() // Remover "Agent: " do início

          // Verificar se o conteúdo é um JSON com plan_markdown
          try {
            const parsedContent = JSON.parse(agentContent)
            if (parsedContent.plan_markdown) {
              // Se for um plano de ensino, usar apenas o conteúdo do markdown
              agentContent = parsedContent.plan_markdown
            }
          } catch (error) {
            // Se não for JSON válido, manter o conteúdo original
            // Isso garante compatibilidade com mensagens normais
          }

          messages.push({
            id: uuidv4(),
            role: "assistant",
            content: agentContent,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(), // Usar timestamp do backend
            threadId,
          })
        }
      })

      // Atualizar a conversa com as mensagens carregadas e o título
      setConversations((prevConversations) =>
        prevConversations.map((conversation) => {
          if (conversation.id === conversationId) {
            return {
              ...conversation,
              messages,
              title: historyResponse.title || conversation.title,
            }
          }
          return conversation
        }),
      )
    } catch (error) {
      console.error("Erro ao carregar conteúdo da conversa:", error)
      toast({
        title: "Erro ao carregar conversa",
        description: "Não foi possível carregar o conteúdo desta conversa.",
        variant: "destructive",
      })
    }
  }

  const filteredConversations = conversations.filter((conversation) => {
    const title = conversation.title ?? "Sem Título" // Se conversation.title for null/undefined, usa "Sem Título"
    return title.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const createNewConversation = () => {
    const newId = uuidv4() // Gerar um ID local único

    // Encontrar o maior número de "Nova conversa X" existente
    const newConversationNumber =
      conversations
        .filter((c) => c.title?.startsWith("Nova conversa"))
        .map((c) => parseInt(c.title?.replace("Nova conversa ", "") ?? "", 10))
        .filter((n) => !isNaN(n))
        .reduce((max, n) => Math.max(max, n), 0) + 1

    const newConversation: Conversation = {
      id: newId,
      title: `Nova conversa ${newConversationNumber}`,
      date: new Date().toISOString().split("T")[0],
      lastMessage: "",
      messages: [],
      threadId: undefined,
    }
    setConversations((prev) => [newConversation, ...prev])
    setActiveConversationId(newId)
    return newId
  }

  const addMessageToConversation = (conversationId: string, message: Omit<Message, "id">) => {
    let finalContent = message.content
    if (message.role === "assistant") {
      try {
        const parsedContent = JSON.parse(finalContent)
        if (parsedContent.plan_markdown) {
          finalContent = parsedContent.plan_markdown
        }
      } catch (error) {
        // Not a JSON string, do nothing
      }
    }

    const newMessage = {
      ...message,
      content: finalContent,
      id: uuidv4(), // Gerar um ID único para a mensagem
    }

    setConversations((prevConversations) =>
      prevConversations.map((conversation) => {
        if (conversation.id === conversationId) {
          return {
            ...conversation,
            messages: [...(conversation.messages || []), newMessage],
            lastMessage: finalContent.substring(0, 50) + (finalContent.length > 50 ? "..." : ""),
            threadId: message.threadId || conversation.threadId, // Atualizar threadId se fornecido
          }
        }
        return conversation
      }),
    )
  }

  // Modificado para chamar o endpoint delete_thread e aceitar um ID como parâmetro - USANDO O SERVIÇO
  const deleteConversation = async (id: string) => {
    console.log("deleteConversation chamado com id:", id)

    try {
      // Encontrar a conversa pelo ID
      const conversation = conversations.find((c) => c.id === id)
      console.log("Conversa encontrada:", conversation)

      if (conversation && conversation.threadId) {
        console.log("Excluindo conversa com threadId:", conversation.threadId, "userId:", userId)

        // USANDO O SERVIÇO EM VEZ DE CHAMADA DIRETA
        const result = await deleteThread(conversation.threadId, userId)
        console.log("Resultado da exclusão:", result)

        if (result.message === "Thread deleted successfully") {
          // Remover a conversa da lista
          setConversations(conversations.filter((c) => c.id !== id))

          // Se a conversa ativa foi excluída, definir activeConversationId como null
          if (activeConversationId === id) {
            setActiveConversationId(null)
          }

          toast({
            title: "Conversa excluída",
            description: "A conversa foi excluída com sucesso.",
          })
        } else {
          throw new Error("Falha ao excluir a conversa")
        }
      } else {
        console.log("Excluindo conversa local (sem threadId)")

        // Se a conversa não tiver threadId (conversa local), apenas remover da lista
        setConversations(conversations.filter((c) => c.id !== id))

        if (activeConversationId === id) {
          setActiveConversationId(null)
        }

        toast({
          title: "Conversa excluída",
          description: "A conversa foi excluída com sucesso.",
        })
      }
    } catch (error) {
      console.error("Erro ao excluir conversa:", error)
      toast({
        title: "Erro ao excluir conversa",
        description: "Não foi possível excluir a conversa. Tente novamente mais tarde.",
        variant: "destructive",
      })
    }
  }

  const renameConversation = async () => {
    if (!conversationToModify || !newConversationTitle.trim()) return

    const conversation = conversations.find((c) => c.id === conversationToModify)
    if (!conversation || !conversation.threadId) {
      toast({
        title: "Erro",
        description: "Não foi possível encontrar a conversa ou o ID da conversa.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      await renameThread(userId, conversation.threadId, newConversationTitle.trim())

      setConversations((prev) =>
        prev.map((c) => (c.id === conversationToModify ? { ...c, title: newConversationTitle.trim() } : c)),
      )

      toast({
        title: "Conversa renomeada",
        description: "A conversa foi renomeada com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao renomear conversa:", error)
      toast({
        title: "Erro ao renomear",
        description: "Não foi possível renomear a conversa. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setIsRenameDialogOpen(false)
      setConversationToModify(null)
      setNewConversationTitle("")
    }
  }

  // Função para atualizar diretamente o título da conversa (sem diálogo)
  const updateConversationTitle = (id: string, newTitle: string) => {
    if (!id || !newTitle.trim()) return

    // Atualizar diretamente o título da conversa
    setConversations((prevConversations) =>
      prevConversations.map((conversation) =>
        conversation.id === id ? { ...conversation, title: newTitle.trim() } : conversation,
      ),
    )
  }

  const openDeleteDialog = (id: string) => {
    console.log("openDeleteDialog chamado com id:", id)
    setConversationToModify(id)
    setIsDeleteDialogOpen(true)
  }

  const openRenameDialog = (id: string, currentTitle: string) => {
    setConversationToModify(id)
    setNewConversationTitle(currentTitle)
    setIsRenameDialogOpen(true)
  }

  const addConversation = (conversation: Conversation) => {
    setConversations((prev) => {
      if (prev.some((c) => c.id === conversation.id)) return prev
      return [conversation, ...prev]
    })
    setActiveConversationId(conversation.id)
  }

  return {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    searchQuery,
    setSearchQuery,
    filteredConversations,
    createNewConversation,
    addConversation,
    deleteConversation,
    renameConversation,
    updateConversationTitle,
    openDeleteDialog,
    openRenameDialog,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isRenameDialogOpen,
    setIsRenameDialogOpen,
    setNewConversationTitle,
    newConversationTitle,
    isProcessing,
    addMessageToConversation,
    isLoadingConversations,
    loadConversationContent,
    loadUserConversations,
    conversationToModify,
  }
}
