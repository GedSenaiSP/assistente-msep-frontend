'use client'

import { useState, useEffect, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Upload, User, BookOpen, Calendar as CalendarIcon, Loader2, Plus, Trash2, FileText, ChevronDown, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CoursePlanUpload } from "./course-plan-upload"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MultiSelect, type Option } from "@/components/ui/multi-select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ReviewInstructionDialog } from "./review-instruction-dialog"
import { UCEntry, getUserConfig, saveManualPlan, setDepartment, reviewTextWithAI } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { Badge } from "./ui/badge"
import { useApp } from "@/contexts/app-context"
import { format } from "date-fns"

// Interfaces
interface School {
  id: number
  nome: string
}

interface PlanoDeAula {
  id: string
  data: Date | undefined
  hora_inicio: string
  hora_fim: string
  capacidades: string[]
  conhecimentos: string[]
  estrategias: string
  recursos: string
  criterios_avaliacao: string[]
  instrumento: string
  referencias: string
}

interface Criterio {
  id: string
  tipo: "dicotomico" | "gradual"
  capacidade: string  // Capacidade associada a este critério
  criterio: string
  nivel1?: string
  nivel2?: string
  nivel3?: string
  nivel4?: string
}

interface SituacaoAprendizagemManual {
  id: string
  tema: string
  desafio: string
  estrategia: string
  conhecimentos: string[]
  capacidades_tecnicas: string[]
  capacidades_socioemocionais: string[]
  criterios: Criterio[]
  plano_aula: PlanoDeAula[]
}

const initialNovaSituacao: SituacaoAprendizagemManual = {
  id: "",
  tema: "",
  desafio: "",
  estrategia: "",
  conhecimentos: [],
  capacidades_tecnicas: [],
  capacidades_socioemocionais: [],
  criterios: [],
  plano_aula: [],
}

const brazilianStates = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
]

export function ManualPlanCreator() {
  const { data: session } = useSession()
  const userIdFromSession = session?.user?.id || "anonymous"
  const { setActiveView, setIsProcessing, setProcessingMessage, conversations, switchToConversation } = useApp()

  const TipTapEditor = useMemo(() => dynamic(() => import("@/components/tiptap-editor").then(m => m.TipTapEditor), { ssr: false }), [])

  // Estados do formulário principal
  const [teacherName, setTeacherName] = useState("")
  const [school, setSchool] = useState("")
  const [regionalDepartment, setRegionalDepartment] = useState("")
  const [courseName, setCourseName] = useState("")
  const [internalTurma, setInternalTurma] = useState("")
  const [modalidade, setModalidade] = useState("")
  const [selectedUC, setSelectedUC] = useState("")
  const [dataInicio, setDataInicio] = useState<Date | undefined>()
  const [dataFim, setDataFim] = useState<Date | undefined>()
  const [isSaving, setIsSaving] = useState(false)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [schools, setSchools] = useState<School[]>([])
  const [isFetchingSchools, setIsFetchingSchools] = useState(false)

  // Estados do processamento do PDF
  const [coursePlanFile, setCoursePlanFile] = useState<File | null>(null)
  const [coursePlanProcessed, setCoursePlanProcessed] = useState(false)
  const [unidadesCurriculares, setUnidadesCurriculares] = useState<UCEntry[]>([])
  const [courseNameLocked, setCourseNameLocked] = useState(false)

  // Opções para seletores
  const [technicalOptions, setTechnicalOptions] = useState<Option[]>([])
  const [socialOptions, setSocialOptions] = useState<Option[]>([])
  const [knowledgeOptions, setKnowledgeOptions] = useState<Option[]>([])

  // Estados para o construtor de SAs
  const [situacoesAprendizagem, setSituacoesAprendizagem] = useState<SituacaoAprendizagemManual[]>([])
  const [novaSituacao, setNovaSituacao] = useState<SituacaoAprendizagemManual>(initialNovaSituacao)

  const fetchSchools = useCallback(async (uf: string) => {
    if (!uf) return
    setIsFetchingSchools(true)
    try {
      const response = await fetch(`/api/schools?uf=${uf}`)
      if (!response.ok) throw new Error("Failed to fetch schools")
      const data = await response.json()
      setSchools(data)
    } catch (error) {
      toast({ title: "Erro ao buscar escolas", variant: "destructive" })
      setSchools([])
    } finally {
      setIsFetchingSchools(false)
    }
  }, [])

  // Lógica de carregamento de dados do usuário
  useEffect(() => {
    if (session?.user?.name) {
      setTeacherName(`${session.user.name} ${session.user.family_name}`)
    }

    const fetchUserData = async () => {
      if (userIdFromSession && userIdFromSession !== "anonymous") {
        try {
          // Primeiro tenta buscar dados completos do usuário (inclui escola)
          const { getUser } = await import("@/services/api")
          const userData = await getUser(userIdFromSession)

          if (userData) {
            if (userData.departamento_regional) {
              setRegionalDepartment(userData.departamento_regional)
              fetchSchools(userData.departamento_regional)
            }
            if (userData.escola) {
              setSchool(userData.escola)
            }
          } else {
            // Fallback para getUserConfig se usuário não existir na tabela users
            const config = await getUserConfig(userIdFromSession)
            if (config.departamento_regional) {
              setRegionalDepartment(config.departamento_regional)
              fetchSchools(config.departamento_regional)
            }
          }
        } catch (error) {
          console.error("Erro ao buscar dados do usuário:", error)
          toast({
            title: "Erro ao buscar configuração",
            description: "Não foi possível carregar seus dados.",
            variant: "destructive",
          })
        }
      }
    }
    fetchUserData()
  }, [session, userIdFromSession, fetchSchools])

  // Lógica para popular os seletores baseados na UC
  useEffect(() => {
    if (selectedUC && unidadesCurriculares.length > 0) {
      const uc = unidadesCurriculares.find((uc) => uc.nomeUC === selectedUC)
      if (uc) {
        setTechnicalOptions((uc.capacidades.CapacidadesTecnicas_list || []).map((c) => ({ label: c, value: c })))
        setSocialOptions((uc.capacidades.CapacidadesSocioemocionais_list || []).map((c) => ({ label: c, value: c })))
        setKnowledgeOptions((uc.conhecimentos || []).map((k) => ({ label: k, value: k })))
      } else {
        setTechnicalOptions([])
        setSocialOptions([])
        setKnowledgeOptions([])
      }
    }
  }, [selectedUC, unidadesCurriculares])

  const handleDepartmentChange = async (department: string) => {
    setRegionalDepartment(department)
    setSchool("")
    setSchools([])

    if (session?.user?.id) {
      try {
        await setDepartment(session.user.id, department)
        toast({
          title: "Departamento regional atualizado",
          description: `O departamento foi definido como ${department}.`,
        })
      } catch (error) {
        console.error("Erro ao atualizar departamento:", error)
        toast({
          title: "Erro ao atualizar",
          description: "Não foi possível atualizar o departamento regional.",
          variant: "destructive",
        })
      }
    }
    fetchSchools(department)
  }

  const handleCoursePlanProcess = (
    threadId: string,
    courseDetails?: { nomeCurso?: string; unidadesCurriculares: UCEntry[] }
  ) => {
    setCoursePlanProcessed(true)
    if (courseDetails) {
      setUnidadesCurriculares(courseDetails.unidadesCurriculares || [])
      if (courseDetails.nomeCurso) {
        setCourseName(courseDetails.nomeCurso)
        setCourseNameLocked(true)
      }
      setSelectedUC("")
    }
  }

  const handleReviewDesafio = async (instruction: string) => {
    setIsReviewDialogOpen(false)
    if (!novaSituacao.desafio) {
      toast({ title: "Campo Desafio vazio", description: "Escreva o desafio antes de pedir a revisão da IA.", variant: "destructive" })
      return
    }
    setProcessingMessage("Revisando texto com a IA...")
    setIsProcessing(true)
    try {
      const payload = {
        html_content: novaSituacao.desafio,
        capacidades_tecnicas: novaSituacao.capacidades_tecnicas,
        capacidades_socioemocionais: novaSituacao.capacidades_socioemocionais,
        conhecimentos: novaSituacao.conhecimentos,
        user_instruction: instruction,
      }
      const response = await reviewTextWithAI(payload)
      setNovaSituacao(prev => ({ ...prev, desafio: response.revised_html_content }))
      toast({ title: "Desafio revisado pela IA!" })
    } catch (error) {
      console.error("Erro ao revisar desafio:", error)
      toast({ title: "Erro na Revisão", description: "Não foi possível conectar com a IA. Tente novamente.", variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  // Funções para manipular Critérios
  const adicionarCriterio = () => setNovaSituacao((prev) => ({ ...prev, criterios: [...prev.criterios, { id: Date.now().toString(), tipo: "dicotomico", capacidade: "", criterio: "" }] }))
  const removerCriterio = (id: string) => setNovaSituacao((prev) => ({ ...prev, criterios: prev.criterios.filter((c) => c.id !== id) }))
  const atualizarCriterio = (id: string, field: keyof Criterio, value: string) => {
    setNovaSituacao((prev) => ({
      ...prev,
      criterios: prev.criterios.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    }))
  }

  // Funções para manipular Etapas do Plano de Aula
  const adicionarLinhaPlano = () => setNovaSituacao((prev) => ({ ...prev, plano_aula: [...prev.plano_aula, { id: Date.now().toString(), data: undefined, hora_inicio: "", hora_fim: "", capacidades: [], conhecimentos: [], estrategias: "", recursos: "", criterios_avaliacao: [], instrumento: "", referencias: "" }] }))
  const removerLinhaPlano = (id: string) => setNovaSituacao((prev) => ({ ...prev, plano_aula: prev.plano_aula.filter((p) => p.id !== id) }))
  const atualizarLinhaPlano = (id: string, field: keyof PlanoDeAula, value: any) => {
    setNovaSituacao((prev) => ({
      ...prev,
      plano_aula: prev.plano_aula.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    }))
  }

  // Funções para manipular Situações de Aprendizagem
  const adicionarSituacao = () => {
    if (!novaSituacao.tema || !novaSituacao.desafio || !novaSituacao.estrategia) {
      toast({ title: "Campos obrigatórios", description: "Tema, desafio e estratégia são obrigatórios.", variant: "destructive" })
      return
    }
    setSituacoesAprendizagem((prev) => [...prev, { ...novaSituacao, id: Date.now().toString() }])
    setNovaSituacao(initialNovaSituacao)
    toast({ title: "Situação de Aprendizagem Adicionada!" })
  }
  const removerSituacao = (id: string) => setSituacoesAprendizagem((prev) => prev.filter((sa) => sa.id !== id))

  const handleSave = async () => {
    if (!courseName || !internalTurma || !selectedUC || situacoesAprendizagem.length === 0) {
      toast({ title: "Formulário Incompleto", description: "Preencha todas as informações do curso e adicione pelo menos uma situação de aprendizagem.", variant: "destructive" })
      return
    }

    const finalPlan = {
      informacoes_gerais: {
        professor: teacherName,
        escola: school,
        departamento_regional: regionalDepartment,
        curso: courseName,
        turma: internalTurma,
        modalidade: modalidade,
        unidade_curricular: selectedUC,
      },
      situacoes_aprendizagem: situacoesAprendizagem,
      user_id: userIdFromSession,
      data_inicio: dataInicio ? format(dataInicio, "yyyy-MM-dd") : undefined,
      data_fim: dataFim ? format(dataFim, "yyyy-MM-dd") : undefined,
    }

    setIsSaving(true)
    try {
      const response = await saveManualPlan(finalPlan)

      // Atualiza a lista de conversas
      console.log("DEBUG: Resposta do salvamento:", response);

      if (response.thread_id && userIdFromSession && userIdFromSession !== "anonymous") {
        console.log("DEBUG: Adicionando conversa otimista para thread:", response.thread_id);

        // Adiciona a nova conversa
        conversations.addConversation({
          id: response.thread_id,
          title: response.title || "Plano Manual: Edição",
          date: new Date().toISOString().split("T")[0],
          messages: [],
          threadId: response.thread_id
        })

        toast({ title: "Plano Salvo com Sucesso!", description: "Seu plano de ensino manual foi salvo e a conversa iniciada." })

        // Redireciona usando o método centralizado do AppContext
        console.log("DEBUG: Trocando para a conversa:", response.thread_id);
        switchToConversation(response.thread_id);
      } else {
        console.warn("DEBUG: Falha na identificação do thread_id ou usuário anônimo", { thread_id: response.thread_id, userId: userIdFromSession });
        toast({ title: "Plano Salvo!", description: "O plano foi salvo, mas não foi possível iniciar a conversa automática." })
        setActiveView("plan-saved")
      }
    } catch (error) {
      console.error("Erro ao salvar plano manual:", error)
      toast({ title: "Erro ao Salvar", description: "Não foi possível salvar o plano. Tente novamente.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="p-2 sm:p-4 bg-msep-blue/5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between flex-wrap">
          <div>
            <h2 className="text-base sm:text-lg font-medium text-primary">Criação Manual de Plano de Ensino</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Preencha todos os campos para montar e salvar um plano de ensino detalhado.
            </p>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-msep-blue" />Plano de Curso (PDF)</CardTitle></CardHeader>
              <CardContent>
                <CoursePlanUpload file={coursePlanFile} onUpload={setCoursePlanFile} onProcess={handleCoursePlanProcess} processed={coursePlanProcessed} userId={userIdFromSession} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-msep-blue" />Informações Gerais</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome do Professor</Label>
                  <Input value={teacherName} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label>Departamento Regional</Label>
                  <Select value={regionalDepartment} onValueChange={handleDepartmentChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione o departamento" /></SelectTrigger>
                    <SelectContent>{brazilianStates.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Escola</Label>
                  <Select value={school} onValueChange={setSchool} disabled={!regionalDepartment || isFetchingSchools}>
                    <SelectTrigger><SelectValue placeholder={isFetchingSchools ? "Carregando..." : "Selecione a escola"} /></SelectTrigger>
                    <SelectContent>{schools.map((s) => (<SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nome do Curso</Label>
                  <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="Digite o nome do curso" disabled={courseNameLocked} />
                </div>
                <div className="space-y-2">
                  <Label>Turma</Label>
                  <Input value={internalTurma} onChange={(e) => setInternalTurma(e.target.value)} placeholder="Digite a turma" />
                </div>
                <div className="space-y-2">
                  <Label>Modalidade</Label>
                  <Select value={modalidade} onValueChange={setModalidade}>
                    <SelectTrigger><SelectValue placeholder="Selecione a modalidade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Presencial">Presencial</SelectItem>
                      <SelectItem value="Híbrido">Híbrido</SelectItem>
                      <SelectItem value="EAD">EAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data de Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataInicio ? format(dataInicio, "PPP") : <span>Selecione a data de início</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Data de Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataFim ? format(dataFim, "PPP") : <span>Selecione a data de fim</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={dataFim} onSelect={setDataFim} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            <Card><CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-msep-blue" />Seleção da Unidade Curricular</CardTitle></CardHeader><CardContent><Label htmlFor="unitSelect">Unidade Curricular</Label><Select value={selectedUC} onValueChange={setSelectedUC} disabled={!coursePlanProcessed}><SelectTrigger id="unitSelect"><SelectValue placeholder={coursePlanProcessed ? "Selecione uma unidade curricular" : "Processe o plano de curso primeiro"} /></SelectTrigger><SelectContent>{unidadesCurriculares.map((uc, index) => (<SelectItem key={index} value={uc.nomeUC}>{uc.nomeUC}</SelectItem>))}</SelectContent></Select></CardContent></Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-msep-blue" />Construtor de Situações de Aprendizagem</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                  <h4 className="font-medium text-lg">Nova Situação de Aprendizagem</h4>

                  <div className="grid md:grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="sa-tema">Tema</Label><Input id="sa-tema" value={novaSituacao.tema} onChange={(e) => setNovaSituacao({ ...novaSituacao, tema: e.target.value })} placeholder="Ex: Construção de API RESTful" /></div><div className="space-y-2"><Label htmlFor="sa-estrategia">Estratégia de Aprendizagem</Label><Select value={novaSituacao.estrategia} onValueChange={(value) => setNovaSituacao({ ...novaSituacao, estrategia: value })}><SelectTrigger><SelectValue placeholder="Selecione a estratégia" /></SelectTrigger><SelectContent><SelectItem value="situacao-problema">Situação-Problema</SelectItem><SelectItem value="estudo-caso">Estudo de Caso</SelectItem><SelectItem value="projetos">Projetos</SelectItem><SelectItem value="pesquisa-aplicada">Pesquisa Aplicada</SelectItem></SelectContent></Select></div></div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sa-desafio">Desafio</Label>
                      <Button size="sm" onClick={() => setIsReviewDialogOpen(true)}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Revisar com IA
                      </Button>
                    </div>
                    <TipTapEditor content={novaSituacao.desafio} onChange={(richText) => setNovaSituacao({ ...novaSituacao, desafio: richText })} />
                  </div>

                  <div className="space-y-2"><Label>Conhecimentos</Label><MultiSelect options={knowledgeOptions} selected={novaSituacao.conhecimentos} onChange={(sel) => setNovaSituacao({ ...novaSituacao, conhecimentos: sel })} placeholder={selectedUC ? "Selecione os conhecimentos" : "Selecione uma UC primeiro"} /></div>
                  <div className="space-y-2"><Label>Capacidades Técnicas</Label><MultiSelect options={technicalOptions} selected={novaSituacao.capacidades_tecnicas} onChange={(sel) => setNovaSituacao({ ...novaSituacao, capacidades_tecnicas: sel })} placeholder={selectedUC ? "Selecione as capacidades" : "Selecione uma UC primeiro"} /></div>
                  <div className="space-y-2"><Label>Capacidades Socioemocionais</Label><MultiSelect options={socialOptions} selected={novaSituacao.capacidades_socioemocionais} onChange={(sel) => setNovaSituacao({ ...novaSituacao, capacidades_socioemocionais: sel })} placeholder={selectedUC ? "Selecione as capacidades" : "Selecione uma UC primeiro"} /></div>

                  <div className="space-y-3">
                    <h5 className="font-medium">Critérios de Avaliação</h5>
                    <TooltipProvider>
                      {novaSituacao.criterios.map((criterio, index) => (
                        <div key={criterio.id} className="border p-3 rounded-md space-y-3 bg-background">
                          <div className="flex justify-between items-center flex-wrap"><p className="font-semibold text-sm">Critério {index + 1}</p><Button variant="ghost" size="icon" onClick={() => removerCriterio(criterio.id)}><Trash2 className="h-4 w-4" /></Button></div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <Label>Capacidade Relacionada</Label>
                              <Select value={criterio.capacidade} onValueChange={(v) => atualizarCriterio(criterio.id, "capacidade", v)}>
                                <SelectTrigger><SelectValue placeholder="Selecione a capacidade" /></SelectTrigger>
                                <SelectContent>
                                  {novaSituacao.capacidades_tecnicas.length > 0 && (
                                    <>
                                      <SelectItem value="__header_tecnicas__" disabled className="font-semibold text-xs text-muted-foreground">Capacidades Técnicas</SelectItem>
                                      {novaSituacao.capacidades_tecnicas.map((cap, i) => (
                                        <SelectItem key={`tec-${i}`} value={cap}>{cap.length > 60 ? cap.substring(0, 60) + "..." : cap}</SelectItem>
                                      ))}
                                    </>
                                  )}
                                  {novaSituacao.capacidades_socioemocionais.length > 0 && (
                                    <>
                                      <SelectItem value="__header_socio__" disabled className="font-semibold text-xs text-muted-foreground">Capacidades Socioemocionais</SelectItem>
                                      {novaSituacao.capacidades_socioemocionais.map((cap, i) => (
                                        <SelectItem key={`socio-${i}`} value={cap}>{cap.length > 60 ? cap.substring(0, 60) + "..." : cap}</SelectItem>
                                      ))}
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>Tipo</Label><Select value={criterio.tipo} onValueChange={(v: Criterio["tipo"]) => atualizarCriterio(criterio.id, "tipo", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="dicotomico">Dicotômico</SelectItem><SelectItem value="gradual">Gradual</SelectItem></SelectContent></Select></div>
                          </div>
                          <div><Label>Critério de Avaliação</Label><Input value={criterio.criterio} onChange={(e) => atualizarCriterio(criterio.id, "criterio", e.target.value)} placeholder="Ex: Documenta a API corretamente" /></div>
                          {criterio.tipo === "gradual" && (
                            <div className="space-y-2 pt-2">
                              <Label className="text-xs text-muted-foreground">Níveis (passe o mouse para ver a descrição)</Label>
                              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                <Tooltip><TooltipTrigger asChild><Input value={criterio.nivel1 || ""} onChange={(e) => atualizarCriterio(criterio.id, "nivel1", e.target.value)} placeholder="Nível 1" /></TooltipTrigger><TooltipContent><p>Nível 1: Descreve o desempenho mínimo esperado do aluno, com características de falta de conhecimento ou domínio.</p></TooltipContent></Tooltip>
                                <Tooltip><TooltipTrigger asChild><Input value={criterio.nivel2 || ""} onChange={(e) => atualizarCriterio(criterio.id, "nivel2", e.target.value)} placeholder="Nível 2" /></TooltipTrigger><TooltipContent><p>Nível 2: Descreve o desempenho do aluno que demonstra alguma compreensão da capacidade, mas ainda precisa de auxílio.</p></TooltipContent></Tooltip>
                                <Tooltip><TooltipTrigger asChild><Input value={criterio.nivel3 || ""} onChange={(e) => atualizarCriterio(criterio.id, "nivel3", e.target.value)} placeholder="Nível 3" /></TooltipTrigger><TooltipContent><p>Nível 3: Descreve o desempenho do aluno que demonstra domínio da capacidade, realizando a tarefa com autonomia e segurança.</p></TooltipContent></Tooltip>
                                <Tooltip><TooltipTrigger asChild><Input value={criterio.nivel4 || ""} onChange={(e) => atualizarCriterio(criterio.id, "nivel4", e.target.value)} placeholder="Nível 4" /></TooltipTrigger><TooltipContent><p>Nível 4: Descreve o desempenho do aluno que demonstra excelência na capacidade, com iniciativa, criatividade e domínio aprofundado.</p></TooltipContent></Tooltip>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </TooltipProvider>
                    <Button variant="outline" size="sm" onClick={adicionarCriterio}><Plus className="h-4 w-4 mr-2" />Adicionar Critério</Button>
                  </div>

                  <div className="space-y-3">
                    <h5 className="font-medium">Plano de Aula</h5>
                    {novaSituacao.plano_aula.map((linha, index) => (
                      <Collapsible key={linha.id} className="border p-4 rounded-md space-y-4 bg-background">
                        <div className="flex justify-between items-center">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="flex-1 justify-start text-left p-0">
                              <ChevronDown className="h-4 w-4 mr-2 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                              <p className="font-semibold text-sm">Aula {index + 1}</p>
                            </Button>
                          </CollapsibleTrigger>
                          <Button variant="ghost" size="icon" onClick={() => removerLinhaPlano(linha.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        <CollapsibleContent className="space-y-4 pt-4 border-t">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Data</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {linha.data ? format(linha.data, "PPP") : <span>Escolha uma data</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar mode="single" selected={linha.data} onSelect={(date) => atualizarLinhaPlano(linha.id, "data", date)} initialFocus />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="space-y-2">
                              <Label>Hora de Início</Label>
                              <Input type="time" value={linha.hora_inicio} onChange={(e) => atualizarLinhaPlano(linha.id, "hora_inicio", e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>Hora de Fim</Label>
                              <Input type="time" value={linha.hora_fim} onChange={(e) => atualizarLinhaPlano(linha.id, "hora_fim", e.target.value)} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Capacidades</Label>
                            <MultiSelect options={[...technicalOptions, ...socialOptions]} selected={linha.capacidades} onChange={(sel) => atualizarLinhaPlano(linha.id, "capacidades", sel)} placeholder="Selecione" />
                          </div>
                          <div className="space-y-2">
                            <Label>Conhecimentos</Label>
                            <MultiSelect options={knowledgeOptions} selected={linha.conhecimentos} onChange={(sel) => atualizarLinhaPlano(linha.id, "conhecimentos", sel)} placeholder="Selecione" />
                          </div>
                          <div className="space-y-2">
                            <Label>Estratégias</Label>
                            <Textarea value={linha.estrategias} onChange={(e) => atualizarLinhaPlano(linha.id, "estrategias", e.target.value)} placeholder="Descreva as estratégias" />
                          </div>
                          <div className="space-y-2">
                            <Label>Recursos e Ambientes Pedagógicos</Label>
                            <Textarea value={linha.recursos} onChange={(e) => atualizarLinhaPlano(linha.id, "recursos", e.target.value)} placeholder="Descreva os recursos" />
                          </div>
                          <div className="space-y-2">
                            <Label>Critérios de Avaliação</Label>
                            <MultiSelect options={novaSituacao.criterios.map(c => ({ label: c.criterio, value: c.criterio }))} selected={linha.criterios_avaliacao} onChange={(sel) => atualizarLinhaPlano(linha.id, "criterios_avaliacao", sel)} placeholder="Selecione" />
                          </div>
                          <div className="space-y-2">
                            <Label>Instrumento de Avaliação</Label>
                            <Textarea value={linha.instrumento} onChange={(e) => atualizarLinhaPlano(linha.id, "instrumento", e.target.value)} placeholder="Ex: Observação direta, Lista de verificação" />
                          </div>
                          <div className="space-y-2">
                            <Label>Referências</Label>
                            <Textarea value={linha.referencias} onChange={(e) => atualizarLinhaPlano(linha.id, "referencias", e.target.value)} placeholder="Liste as referências" />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                    <Button variant="outline" size="sm" onClick={adicionarLinhaPlano}><Plus className="h-4 w-4 mr-2" />Adicionar Aula ao Plano</Button>
                  </div>

                  <Button onClick={adicionarSituacao} className="w-full mt-4">Adicionar Situação de Aprendizagem à Lista</Button>
                </div>

                {situacoesAprendizagem.length > 0 && (<div className="space-y-4"><h4 className="font-medium text-lg">Situações de Aprendizagem Criadas</h4>{situacoesAprendizagem.map((sa, index) => (<Card key={sa.id} className="border-l-4 border-l-msep-blue"><CardHeader className="pb-2"><div className="flex justify-between items-center"><CardTitle className="text-base">{index + 1}: {sa.tema}</CardTitle><Button variant="ghost" size="icon" onClick={() => removerSituacao(sa.id)}><Trash2 className="h-4 w-4" /></Button></div></CardHeader><CardContent><Badge>{sa.estrategia}</Badge><p className="text-sm font-semibold mt-2">Desafio:</p><div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sa.desafio }} /></CardContent></Card>))}</div>)}
              </CardContent>
            </Card>

          </div>
        </ScrollArea>
        <div className="p-4 border-t bg-background">
          <Button onClick={handleSave} disabled={isSaving} className="w-full font-medium py-6" size="lg">
            {isSaving ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Salvando...</>
            ) : (
              <><FileText className="h-5 w-5 mr-2" />Salvar Plano de Ensino Manual</>
            )}
          </Button>
        </div>
      </div>
      <ReviewInstructionDialog isOpen={isReviewDialogOpen} onClose={() => setIsReviewDialogOpen(false)} onConfirm={handleReviewDesafio} />
    </>
  )
}
