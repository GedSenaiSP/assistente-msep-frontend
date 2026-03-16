"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Download, FileText, AlertCircle, BookOpen, Presentation, ListChecks, Eye } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { DocxPreviewModal } from "@/components/docx-preview-modal"
import { useAudio } from "@/hooks/use-audio"
import {
    generateDidacticResourceWithPolling,
    listDidacticResources,
    downloadDidacticResource,
    DidacticResource,
    generateSlidesWithPolling,
    listSlideResources,
    downloadSlides,
    SlideResource,
    SlideTemplate,
    generateExercisesWithPolling,
    getDidacticResourcePreviewUrl,
    getSlidesPreviewUrl,
    getDidacticResourceDownloadUrl,
    getSlidesDownloadUrl,
} from "@/services/api"

interface SituacaoAprendizagem {
    tema_gerador?: string
    desafio?: string
    estrategia_aprendizagem?: {
        tipo?: string
    }
}

interface GenerateResourceModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    planId: string
    planTitle: string
    userId: string
    situacoesAprendizagem: SituacaoAprendizagem[]
}

type ResourceType = "caderno_estudo" | "slides" | "exercicios"

export function GenerateResourceModal({
    open,
    onOpenChange,
    planId,
    planTitle,
    userId,
    situacoesAprendizagem,
}: GenerateResourceModalProps) {
    const [resourceType, setResourceType] = useState<ResourceType>("caderno_estudo")
    const [selectedSaIndex, setSelectedSaIndex] = useState<string>("-1")
    const [numChapters, setNumChapters] = useState(10)
    const [numSlides, setNumSlides] = useState(30)
    const [selectedTemplate, setSelectedTemplate] = useState<SlideTemplate>("dn")
    const [exerciseQuantities, setExerciseQuantities] = useState({
        multiple_choice: 5,
        essay: 2,
        fill_in_the_blank: 3,
        practical: 1,
        matching: 2
    })
    const [isGenerating, setIsGenerating] = useState(false)
    const [progress, setProgress] = useState(0)
    const [currentStep, setCurrentStep] = useState("")
    const [didacticResources, setDidacticResources] = useState<DidacticResource[]>([])
    const [slideResources, setSlideResources] = useState<SlideResource[]>([])

    const [isLoadingResources, setIsLoadingResources] = useState(false)

    // Preview state
    const [previewOpen, setPreviewOpen] = useState(false)
    const [previewUrl, setPreviewUrl] = useState("")
    const [previewTitle, setPreviewTitle] = useState("")
    const [previewDownloadUrl, setPreviewDownloadUrl] = useState<string | undefined>(undefined)
    const [previewFileType, setPreviewFileType] = useState<"docx" | "pptx">("docx")

    const playSuccessSound = useAudio("/music/success-1-6297.mp3")

    // Carregar recursos existentes ao abrir
    useEffect(() => {
        if (open && planId) {
            loadResources()
        }
    }, [open, planId])

    const loadResources = async () => {
        setIsLoadingResources(true)
        try {
            const [didactic, slides] = await Promise.all([
                listDidacticResources(planId),
                listSlideResources(planId)
            ])
            setDidacticResources(didactic)
            setSlideResources(slides)
        } catch (error) {
            console.error("Erro ao carregar recursos:", error)
        } finally {
            setIsLoadingResources(false)
        }
    }

    const handleGenerate = async () => {
        setIsGenerating(true)
        setProgress(0)
        let typeName = resourceType === "caderno_estudo" ? "caderno de estudos" : resourceType === "slides" ? "slides" : "lista de exercícios"
        setCurrentStep(`Iniciando geração de ${typeName}...`)

        try {
            if (resourceType === "caderno_estudo") {
                const result = await generateDidacticResourceWithPolling(
                    planId,
                    parseInt(selectedSaIndex),
                    numChapters,
                    userId,
                    (prog, step) => {
                        setProgress(prog)
                        setCurrentStep(step)
                    }
                )

                toast({
                    title: "Caderno de Estudo gerado com sucesso!",
                    description: `"${result.title}" está pronta para download.`,
                })
                playSuccessSound()
            } else if (resourceType === "slides") {
                const result = await generateSlidesWithPolling(
                    planId,
                    parseInt(selectedSaIndex),
                    numSlides,
                    selectedTemplate,
                    (prog, step) => {
                        setProgress(prog)
                        setCurrentStep(step)
                    }
                )

                toast({
                    title: "Slides gerados com sucesso!",
                    description: `"${result.title}" com ${result.numSlides} slides está pronto para download.`,
                })
                playSuccessSound()
            } else if (resourceType === "exercicios") {
                const result = await generateExercisesWithPolling(
                    planId,
                    parseInt(selectedSaIndex),
                    exerciseQuantities,
                    userId,
                    (prog, step) => {
                        setProgress(prog)
                        setCurrentStep(step)
                    }
                )

                toast({
                    title: "Lista de exercícios gerada!",
                    description: `"${result.title}" está pronta para download.`,
                })
                playSuccessSound()
            }

            // Recarregar lista
            await loadResources()

        } catch (error) {
            console.error("Erro na geração:", error)
            toast({
                title: "Erro na geração",
                description: error instanceof Error ? error.message : "Erro desconhecido",
                variant: "destructive",
            })
        } finally {
            setIsGenerating(false)
            setProgress(0)
            setCurrentStep("")
        }
    }

    const handleDownloadDidactic = async (resource: DidacticResource) => {
        try {
            await downloadDidacticResource(resource.id, resource.title)
            toast({
                title: "Download iniciado",
                description: "O arquivo está sendo baixado.",
            })
        } catch (error) {
            toast({
                title: "Erro no download",
                description: "Não foi possível baixar o arquivo.",
                variant: "destructive",
            })
        }
    }

    const handleDownloadSlides = async (resource: SlideResource) => {
        try {
            await downloadSlides(resource.id, resource.title || "Apresentacao")
            toast({
                title: "Download iniciado",
                description: "O arquivo está sendo baixado.",
            })
        } catch (error) {
            toast({
                title: "Erro no download",
                description: "Não foi possível baixar o arquivo.",
                variant: "destructive",
            })
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return <Badge variant="default" className="bg-green-500">Concluído</Badge>
            case "processing":
                return <Badge variant="secondary">Processando...</Badge>
            case "pending":
                return <Badge variant="outline">Pendente</Badge>
            case "failed":
                return <Badge variant="destructive">Falhou</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const getSaLabel = (index: number) => {
        if (index < 0) return "Todas as SAs"
        const sa = situacoesAprendizagem[index]
        const tema = sa?.tema_gerador || sa?.desafio || `SA ${index + 1}`
        return `SA ${index + 1}: ${tema.substring(0, 40)}${tema.length > 40 ? "..." : ""}`
    }

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            // Não permitir fechar durante a geração
            if (isGenerating && !newOpen) return
            onOpenChange(newOpen)
        }}>
            <DialogContent
                className="max-w-2xl max-h-[85vh] overflow-y-auto"
                onInteractOutside={(e) => {
                    // Prevenir fechamento ao clicar fora durante a geração
                    if (isGenerating) e.preventDefault()
                }}
                onEscapeKeyDown={(e) => {
                    // Prevenir fechamento com ESC durante a geração
                    if (isGenerating) e.preventDefault()
                }}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {resourceType === "caderno_estudo" ? (
                            <BookOpen className="h-5 w-5" />
                        ) : resourceType === "slides" ? (
                            <Presentation className="h-5 w-5" />
                        ) : (
                            <ListChecks className="h-5 w-5" />
                        )}
                        Gerar Recurso Didático
                    </DialogTitle>
                    <DialogDescription>
                        Gere material didático de apoio para as Situações de Aprendizagem do plano "{planTitle}".
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Tipo de Recurso */}
                    <div className="space-y-2">
                        <Label>Tipo de Recurso</Label>
                        <Tabs value={resourceType} onValueChange={(v) => setResourceType(v as ResourceType)}>
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="caderno_estudo" disabled={isGenerating} className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" />
                                    Caderno de Estudo
                                </TabsTrigger>
                                <TabsTrigger value="slides" disabled={isGenerating} className="flex items-center gap-2">
                                    <Presentation className="h-4 w-4" />
                                    Slides
                                </TabsTrigger>
                                <TabsTrigger value="exercicios" disabled={isGenerating} className="flex items-center gap-2">
                                    <ListChecks className="h-4 w-4" />
                                    Exercícios
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Configuração */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="sa-select">Situação de Aprendizagem</Label>
                            <Select
                                value={selectedSaIndex}
                                onValueChange={setSelectedSaIndex}
                                disabled={isGenerating}
                            >
                                <SelectTrigger id="sa-select">
                                    <SelectValue placeholder="Selecione uma SA" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="-1">Todas as SAs</SelectItem>
                                    {situacoesAprendizagem.map((sa, idx) => (
                                        <SelectItem key={idx} value={idx.toString()}>
                                            {getSaLabel(idx)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {resourceType === "caderno_estudo" && (
                            <div className="space-y-2">
                                <Label htmlFor="num-chapters">Número de capítulos (1-100)</Label>
                                <Input
                                    id="num-chapters"
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={numChapters}
                                    onChange={(e) => setNumChapters(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                                    disabled={isGenerating}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Cada capítulo contém aproximadamente 2000-3000 palavras.
                                </p>
                            </div>
                        )}

                        {resourceType === "slides" && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="num-slides">Número de slides (30-300)</Label>
                                    <Input
                                        id="num-slides"
                                        type="number"
                                        min={30}
                                        max={300}
                                        value={numSlides}
                                        onChange={(e) => setNumSlides(Math.min(300, Math.max(30, parseInt(e.target.value) || 30)))}
                                        disabled={isGenerating}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Estrutura completa: abertura, contexto, teoria, exemplos práticos, atividades e conclusão.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="template-select">Template</Label>
                                    <Select
                                        value={selectedTemplate}
                                        onValueChange={(v) => setSelectedTemplate(v as SlideTemplate)}
                                        disabled={isGenerating}
                                    >
                                        <SelectTrigger id="template-select">
                                            <SelectValue placeholder="Selecione um template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="dn">Departamento Nacional</SelectItem>
                                            <SelectItem value="sp">São Paulo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Escolha o template visual para os slides.
                                    </p>
                                </div>
                            </>
                        )}

                        {resourceType === "exercicios" && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="qty-multiple-choice">Múltipla Escolha</Label>
                                    <Input
                                        id="qty-multiple-choice"
                                        type="number"
                                        min={0}
                                        max={20}
                                        value={exerciseQuantities.multiple_choice}
                                        onChange={(e) => setExerciseQuantities({ ...exerciseQuantities, multiple_choice: parseInt(e.target.value) || 0 })}
                                        disabled={isGenerating}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="qty-essay">Dissertativas</Label>
                                    <Input
                                        id="qty-essay"
                                        type="number"
                                        min={0}
                                        max={10}
                                        value={exerciseQuantities.essay}
                                        onChange={(e) => setExerciseQuantities({ ...exerciseQuantities, essay: parseInt(e.target.value) || 0 })}
                                        disabled={isGenerating}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="qty-fill-blank">Completar Lacunas</Label>
                                    <Input
                                        id="qty-fill-blank"
                                        type="number"
                                        min={0}
                                        max={10}
                                        value={exerciseQuantities.fill_in_the_blank}
                                        onChange={(e) => setExerciseQuantities({ ...exerciseQuantities, fill_in_the_blank: parseInt(e.target.value) || 0 })}
                                        disabled={isGenerating}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="qty-practical">Práticas</Label>
                                    <Input
                                        id="qty-practical"
                                        type="number"
                                        min={0}
                                        max={5}
                                        value={exerciseQuantities.practical}
                                        onChange={(e) => setExerciseQuantities({ ...exerciseQuantities, practical: parseInt(e.target.value) || 0 })}
                                        disabled={isGenerating}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="qty-matching">Associar Colunas</Label>
                                    <Input
                                        id="qty-matching"
                                        type="number"
                                        min={0}
                                        max={5}
                                        value={exerciseQuantities.matching}
                                        onChange={(e) => setExerciseQuantities({ ...exerciseQuantities, matching: parseInt(e.target.value) || 0 })}
                                        disabled={isGenerating}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Progresso */}
                    {isGenerating && (
                        <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm font-medium">{currentStep}</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-muted-foreground text-right">{progress}%</p>
                        </div>
                    )}

                    {/* Lista de recursos existentes */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Recursos gerados
                        </Label>

                        {isLoadingResources ? (
                            <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        ) : (
                            <Tabs defaultValue="caderno_estudos" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="caderno_estudos" className="text-xs">
                                        Documentos ({didacticResources.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="slides" className="text-xs">
                                        Slides ({slideResources.length})
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="caderno_estudos" className="mt-2">
                                    {didacticResources.length === 0 ? (
                                        <p className="text-sm text-muted-foreground p-4 text-center bg-muted/30 rounded-lg">
                                            Nenhum documento gerado ainda.
                                        </p>
                                    ) : (
                                        <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                            {didacticResources.map((resource) => (
                                                <div
                                                    key={resource.id}
                                                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm truncate">{resource.title}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {getSaLabel(resource.sa_index)}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-2">
                                                        {getStatusBadge(resource.status)}
                                                        {resource.status === "completed" && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    title="Visualizar"
                                                                    onClick={() => {
                                                                        setPreviewUrl(getDidacticResourcePreviewUrl(resource.id))
                                                                        setPreviewTitle(resource.title)
                                                                        setPreviewDownloadUrl(getDidacticResourceDownloadUrl(resource.id))
                                                                        setPreviewFileType("docx")
                                                                        setPreviewOpen(true)
                                                                    }}
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    title="Baixar"
                                                                    onClick={() => handleDownloadDidactic(resource)}
                                                                >
                                                                    <Download className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        {resource.status === "failed" && resource.error && (
                                                            <span title={resource.error}>
                                                                <AlertCircle className="h-4 w-4 text-destructive" />
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="slides" className="mt-2">
                                    {slideResources.length === 0 ? (
                                        <p className="text-sm text-muted-foreground p-4 text-center bg-muted/30 rounded-lg">
                                            Nenhum slide gerado ainda.
                                        </p>
                                    ) : (
                                        <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                            {slideResources.map((resource) => (
                                                <div
                                                    key={resource.id}
                                                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm truncate">{resource.title || "Apresentação"}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {getSaLabel(resource.sa_index)} • {resource.num_slides || "?"} slides
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-2">
                                                        {getStatusBadge(resource.status)}
                                                        {resource.status === "completed" && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    title="Visualizar"
                                                                    onClick={() => {
                                                                        setPreviewUrl(getSlidesPreviewUrl(resource.id))
                                                                        setPreviewTitle(resource.title || "Apresentação")
                                                                        setPreviewDownloadUrl(getSlidesDownloadUrl(resource.id))
                                                                        setPreviewFileType("pptx")
                                                                        setPreviewOpen(true)
                                                                    }}
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    title="Baixar"
                                                                    onClick={() => handleDownloadSlides(resource)}
                                                                >
                                                                    <Download className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        {resource.status === "failed" && resource.error && (
                                                            <span title={resource.error}>
                                                                <AlertCircle className="h-4 w-4 text-destructive" />
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
                        Fechar
                    </Button>
                    <Button onClick={handleGenerate} disabled={isGenerating || situacoesAprendizagem.length === 0}>
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Gerando...
                            </>
                        ) : resourceType === "caderno_estudo" ? (
                            <>
                                <BookOpen className="mr-2 h-4 w-4" />
                                Gerar Caderno de Estudo
                            </>
                        ) : resourceType === "slides" ? (
                            <>
                                <Presentation className="mr-2 h-4 w-4" />
                                Gerar Slides
                            </>
                        ) : (
                            <>
                                <ListChecks className="mr-2 h-4 w-4" />
                                Gerar Exercícios
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>

            {/* Modal de Preview */}
            <DocxPreviewModal
                isOpen={previewOpen}
                onClose={() => setPreviewOpen(false)}
                title={previewTitle}
                previewUrl={previewUrl}
                downloadUrl={previewDownloadUrl}
                fileType={previewFileType}
            />
        </Dialog >
    )
}
