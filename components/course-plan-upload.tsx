"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, X, CheckCircle, Loader2, FolderOpen } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { UCEntry, ProcessedDocEntry } from "@/services/api"
import { fetchProcessedDocuments, getProcessedDocument, generateThreadId } from "@/services/api"
import { useApp } from "@/contexts/app-context"
import { useAudio } from "@/hooks/use-audio"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"

// Modificar a interface CoursePlanUploadProps para incluir stored_markdown_id
interface CoursePlanUploadProps {
  onUpload: (file: File | null) => void
  file: File | null
  onProcess: (
    threadId: string,
    courseDetails?: {
      nomeCurso?: string
      unidadesCurriculares: UCEntry[]
      stored_markdown_id?: string
    },
  ) => void
  processed: boolean
  userId: string
}

export function CoursePlanUpload({ onUpload, file, onProcess, processed, userId }: CoursePlanUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selectTriggerRef = useRef<HTMLButtonElement>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsLocalProcessing] = useState(false)
  const { setIsProcessing: setGlobalIsProcessing, setProcessingMessage } = useApp()
  const playProcessedSound = useAudio("/music/decidemp3-14575.mp3")

  // Estados para reutilização de documentos processados
  const [processedDocs, setProcessedDocs] = useState<ProcessedDocEntry[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [isLoadingSelectedDoc, setIsLoadingSelectedDoc] = useState(false)

  // Estado do Dialog de Duplicidade
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false)

  // Carregar documentos processados ao montar o componente
  useEffect(() => {
    const loadProcessedDocs = async () => {
      if (!userId) return
      setIsLoadingDocs(true)
      try {
        const docs = await fetchProcessedDocuments(userId)
        setProcessedDocs(docs)
      } catch (error) {
        console.error("Erro ao carregar documentos processados:", error)
      } finally {
        setIsLoadingDocs(false)
      }
    }
    loadProcessedDocs()
  }, [userId])

  // Handler para selecionar documento já processado
  const handleSelectProcessedDoc = async (docId: string) => {
    if (!docId) return

    setIsLoadingSelectedDoc(true)
    setGlobalIsProcessing(true)
    setProcessingMessage("Carregando plano de curso...")

    try {
      const result = await getProcessedDocument(docId)
      if (!result) {
        toast({
          title: "Erro ao carregar documento",
          description: "Não foi possível carregar o documento selecionado.",
          variant: "destructive",
        })
        return
      }

      const threadId = generateThreadId()
      onProcess(threadId, {
        nomeCurso: result.nomeCurso,
        unidadesCurriculares: result.unidadesCurriculares,
        stored_markdown_id: result.stored_markdown_id,
      })

      toast({
        title: "Plano de curso carregado",
        description: "Os dados do plano de curso foram carregados com sucesso.",
      })
      playProcessedSound()
    } catch (error) {
      console.error("Erro ao carregar documento processado:", error)
      toast({
        title: "Erro ao carregar",
        description: "Erro ao carregar o documento.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingSelectedDoc(false)
      setGlobalIsProcessing(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]

      // Verificar se o arquivo é um PDF
      if (selectedFile.type !== "application/pdf") {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Por favor, selecione apenas arquivos PDF.",
          variant: "destructive",
        })
        return
      }

      onUpload(selectedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]

      // Verificar se o arquivo é um PDF
      if (droppedFile.type !== "application/pdf") {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Por favor, selecione apenas arquivos PDF.",
          variant: "destructive",
        })
        return
      }

      onUpload(droppedFile)
    }
  }

  const removeFile = () => {
    onUpload(null)
  }

  // Handler para fechar o diálogo e focar no select
  const handleDuplicateDialogConfirm = () => {
    setIsDuplicateDialogOpen(false)
    // Tenta focar no trigger do select para facilitar para o usuário
    setTimeout(() => {
      selectTriggerRef.current?.focus()
      // Opcional: abrir o select se possível, mas focus já ajuda
    }, 100)
    // Remove o arquivo selecionado pois ele é inválido (duplicado)
    removeFile()
  }

  // Modificar a função handleProcessFile para incluir stored_markdown_id na chamada de onProcess
  const handleProcessFile = async () => {
    if (!file) return

    setGlobalIsProcessing(true)
    setProcessingMessage("Iniciando extração do plano de curso...")
    setIsLocalProcessing(true)

    try {
      // Importar a função processCoursePlan e generateThreadId dinamicamente
      const { processCoursePlan, generateThreadId } = await import("@/services/api")

      // Gerar um novo threadId para o processamento
      const threadId = generateThreadId()

      // Callback para atualizar a mensagem de progresso
      const onProgress = (progress: number, currentStep: string | null) => {
        const stepMessage = currentStep || "Processando..."
        setProcessingMessage(`${stepMessage} (${progress}%)`)
      }

      // Processar o plano de curso com callback de progresso
      const result = await processCoursePlan(file, userId, threadId, onProgress)

      // Chamar a função onProcess com o threadId e os detalhes do curso
      onProcess(threadId, {
        nomeCurso: result.nomeCurso,
        unidadesCurriculares: result.unidadesCurriculares,
        stored_markdown_id: result.stored_markdown_id,
      })

      toast({ title: "Processamento concluído", description: "Os dados do plano de curso foram extraídos com sucesso." })
      playProcessedSound()
    } catch (error: any) {
      console.error("Erro ao processar o plano de curso:", error)

      // Verifica se é erro de duplicata (409)
      const errorMessage = error.message || String(error)
      if (errorMessage.includes("409")) {
        // Abre o DIALOG em vez de mostrar toast
        setIsDuplicateDialogOpen(true)
      } else {
        toast({
          title: "Erro no processamento",
          description: "Não foi possível processar o arquivo. Verifique o console para mais detalhes.",
          variant: "destructive"
        })
      }
    } finally {
      setGlobalIsProcessing(false)
      setIsLocalProcessing(false)
    }
  }

  return (
    <div className="md-card p-5">
      <h3 className="text-lg font-medium mb-5 text-primary">Plano de Curso</h3>

      {/* Seletor de documentos já processados */}
      {processedDocs.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Usar plano já processado</span>
          </div>
          <Select
            onValueChange={handleSelectProcessedDoc}
            disabled={isLoadingSelectedDoc || isProcessing}
          >
            <SelectTrigger className="w-full" ref={selectTriggerRef}>
              <SelectValue placeholder={isLoadingDocs ? "Carregando..." : "Selecione um plano de curso já processado"} />
            </SelectTrigger>
            <SelectContent>
              {processedDocs.map((doc) => (
                <SelectItem key={doc.id} value={doc.id}>
                  {doc.original_pdf_filename}
                  {doc.created_at && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({new Date(doc.created_at).toLocaleDateString('pt-BR')})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-center text-xs text-muted-foreground my-3">— OU —</div>
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border"
          }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="h-10 w-10 text-primary mb-3" />
        <p className="text-center text-sm mb-2">
          Arraste e solte o arquivo do plano de curso aqui ou clique para selecionar
        </p>
        <p className="text-center text-xs text-muted-foreground">
          Faça upload do arquivo PDF do plano de curso para gerar o plano de ensino
        </p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,application/pdf"
        />
      </div>

      {file && (
        <div className="mt-5">
          <div className="text-sm font-medium mb-3">Arquivo do Plano de Curso</div>
          <div className="flex items-center justify-between p-2 rounded-md bg-muted">
            <div className="flex items-center">
              <FileText className="h-4 w-4 mr-2 text-primary" />
              <span className="text-sm truncate max-w-full">{file.name}</span>
              {processed && <CheckCircle className="h-4 w-4 ml-2 text-green-500" />}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                removeFile()
              }}
              className="h-6 w-6 rounded-full p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Button
        className="mt-5 w-full md-button-contained bg-primary"
        onClick={handleProcessFile}
        disabled={!file || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processando...
          </>
        ) : (
          "Processar Plano de Curso"
        )}
      </Button>

      {/* Confirmation Dialog para arquivo duplicado */}
      <ConfirmationDialog
        open={isDuplicateDialogOpen}
        onOpenChange={setIsDuplicateDialogOpen}
        title="Documento Já Processado"
        description="Este plano de curso já existe na nossa base de dados. Para economizar tempo e recursos, por favor selecione-o na lista de 'Usar plano já processado' logo acima."
        confirmLabel="Entendi, vou selecionar na lista"
        cancelLabel="Fechar"
        onConfirm={handleDuplicateDialogConfirm}
        variant="default"
      />
    </div>
  )
}

