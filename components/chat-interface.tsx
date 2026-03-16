"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Loader2, Paperclip, X } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSession } from "next-auth/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { convertPlanJsonToMarkdown } from "@/lib/plan-converter"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatInterfaceProps {
  messages: ChatMessage[]
  onSendMessage: (message: string, files?: File[]) => Promise<void>
  isLoading: boolean
  placeholder?: string
  showFileUpload?: boolean
  assistantName?: string
  assistantAvatarSrc?: string
  assistantAvatarFallback?: string
  messageAlignment?: "default" | "bubbles" | "mixed"
  className?: string
}

function isMarkdown(text: string): boolean {
  const markdownPatterns = [
    /^#+\s+.+$/m, /^\s*[*\-+]\s+.+$/m, /^\s*\d+\.\s+.+$/m,
    /\*\*.+\$\*/, /\*.+\*/, /`[^`]+`/, /```[\s\S]*?```/,
    /.*\]$.+$/, /^\s*>\s+.+$/m, /^\s*---\s*$/m, /!.*\]$.+$/
  ]
  return markdownPatterns.some((pattern) => pattern.test(text))
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  placeholder = "Digite sua mensagem...",
  showFileUpload = false,
  assistantName = "Assistente MSEP",
  assistantAvatarSrc = "/nai.png",
  assistantAvatarFallback = "MS",
  messageAlignment = "default",
  className = "",
}: ChatInterfaceProps) {
  const { toast } = useToast()
  const [input, setInput] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { data: session } = useSession()

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() === "" && (!showFileUpload || files.length === 0)) return

    const messageToSend = input
    const filesToSend = showFileUpload ? files : undefined

    // Limpa a UI imediatamente
    setInput("")
    if (showFileUpload) {
      setFiles([])
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    try {
      await onSendMessage(messageToSend, filesToSend)
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error)
      // Opcional: Restaurar o estado da UI em caso de falha no envio
      // setInput(messageToSend);
      // setFiles(filesToSend || []);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    const MAX_FILES = 10
    const MAX_FILE_SIZE_MB = 100
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
    const ALLOWED_EXTENSIONS = [
      ".pdf", ".docx", ".pptx", ".xlsx", ".txt"
    ];

    if (selectedFiles.length > MAX_FILES) {
      toast({
        title: "Limite de arquivos excedido",
        description: `Você só pode anexar no máximo ${MAX_FILES} arquivos.`,
        variant: "destructive",
      })
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    // Verifica extensões permitidas
    const filesWithValidExtension = Array.from(selectedFiles).filter(file => {
      const fileName = file.name.toLowerCase()
      return ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext))
    })

    if (filesWithValidExtension.length !== selectedFiles.length) {
      const invalidFileNames = Array.from(selectedFiles)
        .filter(file => {
          const fileName = file.name.toLowerCase()
          return !ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext))
        })
        .map(f => f.name)

      toast({
        title: "Arquivos inválidos ignorados",
        description: `Apenas os seguintes tipos são permitidos: ${ALLOWED_EXTENSIONS.join(", ")}. Os arquivos a seguir foram ignorados: ${invalidFileNames.join(", ")}`,
        variant: "destructive",
      })
    }

    // Verifica tamanho dos arquivos
    const filesWithValidSize = filesWithValidExtension.filter(file => file.size <= MAX_FILE_SIZE_BYTES)
    const oversizedFiles = filesWithValidExtension.filter(file => file.size > MAX_FILE_SIZE_BYTES)

    if (oversizedFiles.length > 0) {
      const oversizedFileNames = oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`)
      alert(`⚠️ Arquivos muito grandes!\n\nO tamanho máximo permitido é ${MAX_FILE_SIZE_MB}MB.\n\nOs seguintes arquivos foram ignorados:\n${oversizedFileNames.join("\n")}`)
    }

    setFiles(filesWithValidSize)

    if (filesWithValidSize.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const getUserInitials = () => {
    if (!session?.user?.name) return "EU"
    return session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)
  }

  const getMessageContainerClass = (role: "user" | "assistant") => {
    if (role === "assistant") return "justify-start"
    switch (messageAlignment) {
      case "bubbles":
      case "mixed":
        return "justify-end"
      default:
        return "justify-start"
    }
  }

  const getMessageBackgroundClass = (role: "user" | "assistant") => {
    if (role === "assistant") return "bg-card"
    switch (messageAlignment) {
      case "bubbles":
        return "bg-primary text-primary-foreground"
      case "mixed":
      default:
        return "bg-muted"
    }
  }

  const getAvatarOrderClass = (role: "user" | "assistant") => {
    if (role === "assistant") return ""
    switch (messageAlignment) {
      case "bubbles":
      case "mixed":
        return "ml-2 order-2"
      default:
        return ""
    }
  }

  const getContentOrderClass = (role: "user" | "assistant") => {
    if (role === "assistant") return ""
    switch (messageAlignment) {
      case "bubbles":
      case "mixed":
        return "order-1"
      default:
        return ""
    }
  }

  const getHeaderAlignmentClass = (role: "user" | "assistant") => {
    if (role === "assistant") return "justify-start"
    switch (messageAlignment) {
      case "bubbles":
      case "mixed":
        return "justify-end"
      default:
        return "justify-start"
    }
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {messages.map((message) => {
            let displayContent = message.content
            let isJsonPlan = false

            // Tentar detectar se é um JSON de plano de ensino (mesmo que venha do histórico como string)
            if (message.role === "assistant" && (message.content.trim().startsWith("{") || message.content.trim().startsWith("```json"))) {
              try {
                let cleanContent = message.content.trim()
                if (cleanContent.startsWith("```json")) {
                  cleanContent = cleanContent.replace(/^```json/, "").replace(/```$/, "")
                } else if (cleanContent.startsWith("```")) {
                  cleanContent = cleanContent.replace(/^```/, "").replace(/```$/, "")
                }

                const parsed = JSON.parse(cleanContent)
                if (parsed && (parsed.plan_json || parsed.plano_de_ensino)) {
                  displayContent = convertPlanJsonToMarkdown(parsed)
                  isJsonPlan = true
                }
              } catch (e) {
                // Não é um JSON válido ou não é um plano, mantém original
              }
            }

            return (
              <div key={message.id} className={`flex gap-3 ${getMessageContainerClass(message.role)}`}>
                {message.role === "assistant" ? (
                  <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                    <AvatarImage src={assistantAvatarSrc || "/placeholder.svg"} alt={assistantName} />
                    <AvatarFallback className="bg-primary text-primary-foreground">{assistantAvatarFallback}</AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar className={`h-8 w-8 mt-1 flex-shrink-0 ${getAvatarOrderClass(message.role)}`}>
                    <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || "Usuário"} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                )}
                <div className={`flex-1 min-w-0 ${getContentOrderClass(message.role)}`}>
                  <div className={`flex items-center gap-2 mb-1 ${getHeaderAlignmentClass(message.role)}`}>
                    <span className="font-medium text-sm">{message.role === "assistant" ? assistantName : session?.user?.name || "Você"}</span>
                    <span className="text-xs text-muted-foreground">{format(message.timestamp, "HH:mm · dd MMM yyyy", { locale: ptBR })}</span>
                  </div>
                  <div className={`rounded-lg p-3 md-elevation-1 break-words ${getMessageBackgroundClass(message.role)}`}>
                    {(message.role === "assistant" && (isMarkdown(displayContent) || isJsonPlan)) ? (
                      <div className="markdown-content max-w-full overflow-x-auto">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ node, ...props }) => <h1 className="text-xl font-bold my-3 break-words" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-lg font-bold my-2 break-words" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-md font-bold my-2 break-words" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2" {...props} />,
                            li: ({ node, ...props }) => <li className="my-1 break-words" {...props} />,
                            p: ({ node, ...props }) => <p className="my-2 break-words" {...props} />,
                            a: ({ node, ...props }) => <a className="text-primary underline break-all" {...props} />,
                            code: ({ node, inline, className, children, ...props }) => {
                              const match = /language-(\w+)/.exec(className || "")
                              return !inline && match ? (
                                <div className="overflow-x-auto my-3">
                                  <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" className="rounded-md" {...props}>
                                    {String(children).replace(/\n$/, "")}
                                  </SyntaxHighlighter>
                                </div>
                              ) : (
                                <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono break-all" {...props}>
                                  {children}
                                </code>
                              )
                            },
                            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-muted pl-4 italic my-2 break-words" {...props} />,
                            hr: ({ node, ...props }) => <hr className="my-4 border-muted" {...props} />,
                            img: ({ node, ...props }) => <img className="max-w-full h-auto my-2" {...props} />,
                            table: ({ node, ...props }) => <div className="overflow-x-auto my-2 border rounded-md"><table className="min-w-full divide-y divide-border" {...props} /></div>,
                            th: ({ node, ...props }) => <th className="px-3 py-2 text-left font-medium bg-muted text-sm break-words" {...props} />,
                            td: ({ node, ...props }) => <td className="px-3 py-2 border-t border-muted text-sm break-words" {...props} />,
                          }}
                        >
                          {displayContent}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words">{displayContent}</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                <AvatarImage src={assistantAvatarSrc || "/placeholder.svg"} alt={assistantName} />
                <AvatarFallback className="bg-primary text-primary-foreground">{assistantAvatarFallback}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{assistantName}</span>
                </div>
                <div className="rounded-lg p-3 md-surface md-elevation-1 flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Gerando resposta...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t md-surface md-elevation-1">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {showFileUpload && files.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center bg-muted rounded-full px-3 py-1 text-sm">
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 rounded-full" onClick={() => removeFile(index)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            {showFileUpload && (
              <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-5 w-5" />
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept=".pdf,.docx,.pptx,.xlsx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain" />
              </Button>
            )}

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              className="md-text-field flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || (input.trim() === "" && (!showFileUpload || files.length === 0))} className="md-button-contained bg-primary">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
