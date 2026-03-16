"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Upload, User, BookOpen, Calendar, Loader2, Plus, Trash2 } from "lucide-react"
import { generateTeachingPlanAPI, setDepartment, getUserConfig } from "@/services/api"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CoursePlanUpload } from "./course-plan-upload"
import { ScheduleBuilder } from "./schedule-builder"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MultiSelect, type Option } from "@/components/ui/multi-select"
import type { UCEntry } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { useApp } from "@/contexts/app-context"
import { useAudio } from "@/hooks/use-audio"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"

// Adicionar a interface para a resposta da API
interface PlanGenerationResponse {
  userId: string
  threadId: string
  plan_markdown: string
}

// Interface para UC com capacidades selecionadas (Projeto Integrador)
interface UCSelectionState {
  nomeUC: string
  capacidades_tecnicas: string[]
  capacidades_socioemocionais: string[]
  technicalOptions: Option[]
  socialOptions: Option[]
}

// Nova interface para situação de aprendizagem
// Função utilitária para parsear carga horária flexível
const parseCargaHoraria = (text: string): number => {
  if (!text) return 0

  const normalized = text.toLowerCase().replace(/\s+/g, '') // Remove espaços

  // Tenta extrair horas e minutos com regex flexível (ex: 33h20, 33h20min, 33horas20)
  const match = normalized.match(/(\d+)(?:h|horas?)(?:e?)(\d+)?(?:m|min|minutos?)?/)

  if (match) {
    const horas = parseInt(match[1])
    const minutos = match[2] ? parseInt(match[2]) : 0
    return horas + (minutos / 60)
  }

  // Fallback para decimal simples (33.33)
  const simpleMatch = normalized.match(/(\d+([.,]\d+)?)/)
  if (simpleMatch) {
    return parseFloat(simpleMatch[0].replace(',', '.'))
  }

  return 0
}

interface SituacaoAprendizagem {
  id: string
  capacidades_tecnicas: string[]
  capacidades_socioemocionais: string[]
  estrategia: string
  tema_desafio: string
  carga_horaria: number  // Carga horária em horas
  // Para Projeto Integrador: múltiplas UCs
  unidades_curriculares?: UCSelectionState[]
}

interface PlanGeneratorProps {
  teacherName: string
  school: string
  courseName: string
  turma: string
  unit: string
  startDate: string
  endDate: string
  technicalCapabilities: string[]
  socialCapabilities: string[]
  learningActivities: any[]
  activePlan: any
  generatePlan: (prompt: string) => void
  files: File[]
  onUpload: (files: File[]) => void
  onProcess: () => void
  processedFiles: string[]
  setTeacherName: (name: string) => void
  setSchool: (school: string) => void
  setCourseName: (name: string) => void
  setTurma: (turma: string) => void
  setCourseName: (name: string) => void
  setTurma: (turma: string) => void
  setUnit: (unit: string) => void
  setModalidade: (modalidade: string) => void
  setStartDate: (date: string) => void
  setEndDate: (date: string) => void
  setTechnicalCapabilities: (capabilities: string[]) => void
  setSocialCapabilities: (capabilities: string[]) => void
  setLearningType: (type: string) => void
  schedule: any[]
  setSchedule: (schedule: any[]) => void
  setLearningActivities: (activities: any[]) => void
  userId: string
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

interface School {
  id: number
  nome: string
}

export function PlanGenerator({
  teacherName,
  school,
  courseName,
  turma,
  unit,
  startDate,
  endDate,
  setTeacherName,
  setSchool,
  setCourseName,
  setUnit,
  setStartDate,
  setEndDate,
  schedule,
  setSchedule,
}: PlanGeneratorProps) {
  const { data: session } = useSession()
  const userIdFromSession = session?.user?.id || "anonymous"
  const { conversations, setActiveView, isProcessing, setIsProcessing, setProcessingMessage } = useApp()
  const playSuccessSound = useAudio("/music/success-1-6297.mp3")
  const [regionalDepartment, setRegionalDepartment] = useState<string>("")
  const [modalidade, setModalidade] = useState<string>("")
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [schools, setSchools] = useState<School[]>([])
  const [isFetchingSchools, setIsFetchingSchools] = useState(false)

  // Função para validar datas digitadas manualmente
  const validateDate = (dateValue: string, fieldName: string): boolean => {
    if (!dateValue) return true // Campo vazio é válido

    const dateParts = dateValue.split('-')
    if (dateParts.length >= 1) {
      const year = parseInt(dateParts[0], 10)
      if (isNaN(year) || year > 9999) {
        toast({
          title: "Data inválida",
          description: `O ano em "${fieldName}" não pode ser maior que 9999.`,
          variant: "destructive",
        })
        return false
      }
      if (year < 1900) {
        toast({
          title: "Data inválida",
          description: `O ano em "${fieldName}" não pode ser menor que 1900.`,
          variant: "destructive",
        })
        return false
      }
    }
    return true
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (validateDate(value, "Data de Início")) {
      setStartDate(value)
    } else {
      setStartDate("")
      e.target.value = ""
    }
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (validateDate(value, "Data de Fim")) {
      setEndDate(value)
    } else {
      setEndDate("")
      e.target.value = ""
    }
  }

  useEffect(() => {
    if (session?.user?.name) {
      setTeacherName(session.user.name + " " + session.user.family_name)
    }
  }, [session, setTeacherName])

  useEffect(() => {
    const fetchUserData = async () => {
      if (userIdFromSession && userIdFromSession !== "anonymous") {
        try {
          setIsLoadingConfig(true)
          // Primeiro tenta buscar dados completos do usuário (inclui escola)
          const { getUser } = await import("@/services/api")
          const userData = await getUser(userIdFromSession)

          if (userData) {
            if (userData.departamento_regional) {
              setRegionalDepartment(userData.departamento_regional)
            }
            if (userData.escola) {
              setSchool(userData.escola)
            }
          } else {
            // Fallback para getUserConfig se usuário não existir na tabela users
            const config = await getUserConfig(userIdFromSession)
            if (config.departamento_regional) {
              setRegionalDepartment(config.departamento_regional)
            }
          }
        } catch (error) {
          console.error("Erro ao buscar dados do usuário:", error)
          toast({
            title: "Erro ao buscar configuração",
            description: "Não foi possível carregar seus dados.",
            variant: "destructive",
          })
        } finally {
          setIsLoadingConfig(false)
        }
      } else {
        setIsLoadingConfig(false)
      }
    }
    fetchUserData()
  }, [userIdFromSession, setSchool])

  const [storedMarkdownId, setStoredMarkdownId] = useState<string>("")
  const [coursePlanFile, setCoursePlanFile] = useState<File | null>(null)
  const [coursePlanProcessed, setCoursePlanProcessed] = useState(false)
  const [coursePlanThreadId, setCoursePlanThreadId] = useState<string>("")
  const [unidadesCurriculares, setUnidadesCurriculares] = useState<UCEntry[]>([])
  const [selectedUC, setSelectedUC] = useState<string>("")
  const [courseNameLocked, setCourseNameLocked] = useState(false)
  const [internalTurma, setInternalTurma] = useState<string>("")
  const [technicalOptions, setTechnicalOptions] = useState<Option[]>([])
  const [socialOptions, setSocialOptions] = useState<Option[]>([])
  const [situacoesAprendizagem, setSituacoesAprendizagem] = useState<SituacaoAprendizagem[]>([])
  const [novaSituacao, setNovaSituacao] = useState<Partial<SituacaoAprendizagem>>({
    capacidades_tecnicas: [],
    capacidades_socioemocionais: [],
    estrategia: "",
    tema_desafio: "",
    carga_horaria: undefined,  // Campo obrigatório - sem valor padrão
  })

  // Estados para Projeto Integrador (múltiplas UCs)
  const [selectedUCsForPI, setSelectedUCsForPI] = useState<UCSelectionState[]>([])
  const isProjetoIntegrador = novaSituacao.estrategia === "projeto-integrador"

  // Estado para UC selecionada na SA atual (estratégias não-PI)
  const [selectedUCForSA, setSelectedUCForSA] = useState<string>("")
  const [technicalOptionsForSA, setTechnicalOptionsForSA] = useState<Option[]>([])
  const [socialOptionsForSA, setSocialOptionsForSA] = useState<Option[]>([])

  // Estado para erros de validação dos campos
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  // Estado para erros dos campos da nova situação de aprendizagem
  const [situacaoFieldErrors, setSituacaoFieldErrors] = useState<Record<string, string>>({})

  // Estado para Dialog de aviso de capacidades faltantes
  const [isCapabilityWarningDialogOpen, setIsCapabilityWarningDialogOpen] = useState(false)
  const [pendingCapabilityWarnings, setPendingCapabilityWarnings] = useState<{ tecnicas: string[], socioemocionais: string[] }>({ tecnicas: [], socioemocionais: [] })

  const clearSituacaoFieldError = (fieldName: string) => {
    if (situacaoFieldErrors[fieldName]) {
      setSituacaoFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }

  useEffect(() => {
    if (selectedUC && unidadesCurriculares.length > 0) {
      const uc = unidadesCurriculares.find((uc) => uc.nomeUC === selectedUC)
      if (uc) {
        const technicalCapabilitiesFromUC = uc.capacidades.CapacidadesTecnicas_list || []
        const socialCapabilitiesFromUC = uc.capacidades.CapacidadesSocioemocionais_list || []
        setTechnicalOptions(technicalCapabilitiesFromUC.map((cap) => ({ label: cap, value: cap })))
        setSocialOptions(socialCapabilitiesFromUC.map((cap) => ({ label: cap, value: cap })))
        setUnit(uc.nomeUC)
      }
    } else {
      setTechnicalOptions([])
      setSocialOptions([])
    }
  }, [selectedUC, unidadesCurriculares, setUnit])

  useEffect(() => {
    const fetchSchools = async () => {
      if (regionalDepartment) {
        setIsFetchingSchools(true)
        setSchools([])
        try {
          const response = await fetch(`/api/schools?uf=${regionalDepartment}`)
          if (!response.ok) {
            throw new Error("Failed to fetch schools")
          }
          const data = await response.json()
          setSchools(data)
        } catch (error) {
          console.error("Erro ao buscar escolas:", error)
          toast({
            title: "Erro ao buscar escolas",
            description: "Não foi possível carregar a lista de escolas para este departamento.",
            variant: "destructive",
          })
        } finally {
          setIsFetchingSchools(false)
        }
      } else {
        setSchools([])
      }
    }
    fetchSchools()
  }, [regionalDepartment])

  const handleDepartmentChange = async (department: string) => {
    setRegionalDepartment(department)
    setSchool("") // Reset school selection

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
  }

  // Função para validar todos os campos e retornar erros
  const validateFields = (): Record<string, string> => {
    const errors: Record<string, string> = {}

    if (!coursePlanProcessed) {
      errors.coursePlan = "Faça o upload e processamento do plano de curso"
    }
    if (!regionalDepartment) {
      errors.regionalDepartment = "Selecione o departamento regional"
    }
    if (!school.trim()) {
      errors.school = "Selecione a unidade escolar"
    }
    if (!internalTurma.trim()) {
      errors.turma = "Informe o nome da turma"
    }
    if (!modalidade) {
      errors.modalidade = "Selecione a modalidade"
    }
    if (!startDate) {
      errors.startDate = "Informe a data de início"
    }
    if (!endDate) {
      errors.endDate = "Informe a data de término"
    }
    if (situacoesAprendizagem.length === 0) {
      errors.situacoes = "Crie pelo menos uma situação de aprendizagem"
    }
    if (schedule.length === 0) {
      errors.schedule = "Adicione pelo menos um horário de aula"
    }

    // Removido: validação de capacidades agora é apenas um aviso (não bloqueia)

    return errors
  }

  // Função para verificar capacidades faltantes (retorna AVISOS, não erros bloqueantes)
  const getCapabilityWarnings = (): { tecnicas: string[], socioemocionais: string[] } => {
    const warnings = { tecnicas: [] as string[], socioemocionais: [] as string[] }

    if (situacoesAprendizagem.length === 0 || unidadesCurriculares.length === 0) {
      return warnings
    }

    // Coletar todas as UCs usadas nas SAs
    const ucsUtilizadas = new Set<string>()
    situacoesAprendizagem.forEach(sa => {
      if (sa.unidades_curriculares) {
        sa.unidades_curriculares.forEach(uc => ucsUtilizadas.add(uc.nomeUC))
      }
    })

    // Para cada UC utilizada, verificar se todas as capacidades foram cobertas
    const capacidadesTecnicasNecessarias = new Set<string>()
    const capacidadesSociaisNecessarias = new Set<string>()

    ucsUtilizadas.forEach(ucNome => {
      const uc = unidadesCurriculares.find(u => u.nomeUC === ucNome)
      if (uc) {
        uc.capacidades.CapacidadesTecnicas_list.forEach(cap => capacidadesTecnicasNecessarias.add(cap))
        uc.capacidades.CapacidadesSocioemocionais_list.forEach(cap => capacidadesSociaisNecessarias.add(cap))
      }
    })

    // Coletar todas as capacidades selecionadas em todas as SAs
    const capacidadesTecnicasSelecionadas = new Set<string>()
    const capacidadesSociaisSelecionadas = new Set<string>()

    situacoesAprendizagem.forEach(sa => {
      if (sa.unidades_curriculares) {
        sa.unidades_curriculares.forEach(uc => {
          uc.capacidades_tecnicas.forEach(cap => capacidadesTecnicasSelecionadas.add(cap))
          uc.capacidades_socioemocionais.forEach(cap => capacidadesSociaisSelecionadas.add(cap))
        })
      } else {
        sa.capacidades_tecnicas.forEach(cap => capacidadesTecnicasSelecionadas.add(cap))
        sa.capacidades_socioemocionais.forEach(cap => capacidadesSociaisSelecionadas.add(cap))
      }
    })

    // Verificar capacidades técnicas faltantes
    capacidadesTecnicasNecessarias.forEach(cap => {
      if (!capacidadesTecnicasSelecionadas.has(cap)) {
        warnings.tecnicas.push(cap)
      }
    })

    // Verificar capacidades socioemocionais faltantes
    capacidadesSociaisNecessarias.forEach(cap => {
      if (!capacidadesSociaisSelecionadas.has(cap)) {
        warnings.socioemocionais.push(cap)
      }
    })

    return warnings
  }

  // Função para limpar erro de um campo específico
  const clearFieldError = (fieldName: string) => {
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }

  const generateTeachingPlan = async () => {
    // Validar todos os campos obrigatórios (bloqueantes)
    const errors = validateFields()
    setFieldErrors(errors)

    // Se houver erros bloqueantes, mostrar toast resumido e não prosseguir
    if (Object.keys(errors).length > 0) {
      toast({
        title: "Campos obrigatórios não preenchidos",
        description: `Por favor, preencha os ${Object.keys(errors).length} campo(s) destacados em vermelho.`,
        variant: "destructive",
      })
      return
    }

    // Verificar avisos de capacidades (não bloqueantes)
    const warnings = getCapabilityWarnings()
    const hasWarnings = warnings.tecnicas.length > 0 || warnings.socioemocionais.length > 0

    if (hasWarnings) {
      // Salvar os avisos e mostrar dialog de confirmação
      setPendingCapabilityWarnings(warnings)
      setIsCapabilityWarningDialogOpen(true)
      return
    }

    // Se não houver avisos, prosseguir diretamente com a geração
    await doGeneratePlan()
  }

  // Função que efetivamente gera o plano (chamada após validação e confirmação)
  const doGeneratePlan = async () => {
    let activeConversationId = conversations.activeConversationId
    if (!activeConversationId) {
      activeConversationId = conversations.createNewConversation()
    }

    setIsProcessing(true)
    setProcessingMessage("Gerando seu plano de ensino com a IA...")

    try {
      const horarios =
        schedule && schedule.length > 0
          ? schedule.map((entry) => ({
            dia: entry.day,
            horaInicio: entry.startTime,
            horaFim: entry.endTime,
          }))
          : [{ dia: "Segunda-feira", horaInicio: "19:00", horaFim: "22:00" }]

      const result = await generateTeachingPlanAPI(
        userIdFromSession,
        coursePlanThreadId,
        storedMarkdownId,
        teacherName,
        school,
        courseName,
        internalTurma,
        modalidade,
        situacoesAprendizagem[0]?.unidades_curriculares?.[0]?.nomeUC || "", // UC da primeira SA ou vazio
        situacoesAprendizagem,
        horarios,
        regionalDepartment,
        startDate,
        endDate,
        // Callback para atualizar progresso durante polling
        (progress, currentStep) => {
          setProcessingMessage(currentStep || `Gerando plano... ${progress}%`)
        }
      )

      const planMessage = {
        role: "assistant" as const,
        content: result.plan_markdown,
        timestamp: new Date(),
        threadId: result.threadId,
      }

      conversations.addMessageToConversation(activeConversationId, planMessage)

      // Extrair o título do Markdown e atualizar a conversa
      const markdownLines = result.plan_markdown.split('\n');
      const titleLine = markdownLines.find(line => line.startsWith('# '));
      if (titleLine) {
        const newTitle = titleLine.substring(2).trim();
        conversations.updateConversationTitle(activeConversationId, newTitle);
      }

      const instructionMessage = {
        role: "assistant" as const,
        content:
          "Aqui está o plano de ensino gerado. Você pode me pedir para fazer modificações específicas ou tirar dúvidas sobre o plano.",
        timestamp: new Date(),
        threadId: result.threadId,
      }
      conversations.addMessageToConversation(activeConversationId, instructionMessage)

      toast({
        title: "Plano de ensino gerado com sucesso",
        description: "O plano foi enviado para a sua conversa ativa.",
      })
      playSuccessSound()

      // Resetar campos para permitir gerar novo plano
      setStartDate("")
      setEndDate("")

      setActiveView("chat")
    } catch (error) {
      console.error("Erro ao gerar plano de ensino:", error)
      toast({
        title: "Erro ao gerar plano de ensino",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const podeGerarPlano = () => {
    return (
      coursePlanProcessed &&
      situacoesAprendizagem.length > 0 &&
      schedule.length > 0 &&
      regionalDepartment &&
      teacherName.trim() &&
      school.trim() &&
      startDate &&
      endDate &&
      internalTurma.trim() &&
      modalidade
    )
  }

  const handleCoursePlanProcess = (
    threadId: string,
    courseDetails?: { nomeCurso?: string; unidadesCurriculares: UCEntry[]; stored_markdown_id?: string },
  ) => {
    setCoursePlanThreadId(threadId)
    setCoursePlanProcessed(true)
    if (courseDetails?.stored_markdown_id) {
      setStoredMarkdownId(courseDetails.stored_markdown_id)
    }
    if (courseDetails) {
      setUnidadesCurriculares(courseDetails.unidadesCurriculares || [])
      if (courseDetails.nomeCurso) {
        setCourseName(courseDetails.nomeCurso)
        setCourseNameLocked(true)
      }
      setSelectedUC("")
      setTechnicalOptions([])
      setSocialOptions([])
    }
  }

  const handleCoursePlanUpload = (file: File | null) => {
    setCoursePlanFile(file)
    setCoursePlanProcessed(false)
    setUnidadesCurriculares([])
    setSelectedUC("")
    setCourseNameLocked(false)
    setTechnicalOptions([])
    setSocialOptions([])
  }

  const adicionarSituacaoAprendizagem = () => {
    const errors: Record<string, string> = {}

    // Validação para Projeto Integrador (múltiplas UCs)
    if (isProjetoIntegrador) {
      if (selectedUCsForPI.length < 2) {
        errors.unidades_curriculares = "Projeto Integrador requer pelo menos 2 unidades curriculares"
      } else {
        // Validar que cada UC tem capacidades selecionadas
        const ucsInvalidas = selectedUCsForPI.filter(
          uc => uc.capacidades_tecnicas.length === 0 || uc.capacidades_socioemocionais.length === 0
        )
        if (ucsInvalidas.length > 0) {
          errors.unidades_curriculares = "Todas as UCs devem ter capacidades técnicas e socioemocionais selecionadas"
        }
      }
    } else {
      // Validação padrão para outras estratégias
      if (!selectedUCForSA) {
        errors.uc = "Selecione a unidade curricular para esta SA"
      }
      if (!novaSituacao.capacidades_tecnicas?.length) {
        errors.capacidades_tecnicas = "Selecione pelo menos uma capacidade técnica"
      }
      if (!novaSituacao.capacidades_socioemocionais?.length) {
        errors.capacidades_socioemocionais = "Selecione pelo menos uma capacidade socioemocional"
      }
    }

    if (!novaSituacao.estrategia) {
      errors.estrategia = "Selecione a estratégia de aprendizagem"
    }
    if (!novaSituacao.carga_horaria || novaSituacao.carga_horaria <= 0) {
      errors.carga_horaria = "Informe a carga horária da SA"
    }

    // Melhoria 3: Validar que soma das cargas horárias das SAs não ultrapassa a carga horária da UC
    // Aplica apenas para estratégias não-PI
    if (!isProjetoIntegrador && selectedUCForSA && novaSituacao.carga_horaria && novaSituacao.carga_horaria > 0) {
      const ucSelecionada = unidadesCurriculares.find(uc => uc.nomeUC === selectedUCForSA)
      if (ucSelecionada?.carga_horaria_total) {
        // Extrair número da carga horária usando parser robusto
        // Suporta "33h20", "33 horas", etc.
        const cargaHorariaUC = parseCargaHoraria(ucSelecionada.carga_horaria_total)

        if (cargaHorariaUC > 0) {
          // Somar carga horária das SAs existentes para a mesma UC
          const somaCargaHorariaSAsExistentes = situacoesAprendizagem
            .filter(sa =>
              sa.estrategia !== "projeto-integrador" &&
              sa.unidades_curriculares?.[0]?.nomeUC === selectedUCForSA
            )
            .reduce((soma, sa) => soma + (sa.carga_horaria || 0), 0)

          const totalComNovaSA = somaCargaHorariaSAsExistentes + novaSituacao.carga_horaria

          if (totalComNovaSA > cargaHorariaUC) {
            const restante = cargaHorariaUC - somaCargaHorariaSAsExistentes
            errors.carga_horaria = `Carga horária excede o limite da UC (${cargaHorariaUC}h). Já utilizado: ${somaCargaHorariaSAsExistentes}h. Disponível: ${restante > 0 ? restante : 0}h`
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setSituacaoFieldErrors(errors)
      return
    }

    // Criar situação de aprendizagem
    let situacao: SituacaoAprendizagem

    if (isProjetoIntegrador) {
      // Para Projeto Integrador: consolidar capacidades de todas as UCs
      const todasCapacidadesTecnicas = selectedUCsForPI.flatMap(uc => uc.capacidades_tecnicas)
      const todasCapacidadesSocioemocionais = selectedUCsForPI.flatMap(uc => uc.capacidades_socioemocionais)

      situacao = {
        id: Date.now().toString(),
        capacidades_tecnicas: [...new Set(todasCapacidadesTecnicas)], // Remove duplicatas
        capacidades_socioemocionais: [...new Set(todasCapacidadesSocioemocionais)],
        estrategia: novaSituacao.estrategia || "",
        tema_desafio: novaSituacao.tema_desafio || "Tema será gerado automaticamente pela IA",
        carga_horaria: novaSituacao.carga_horaria!,
        unidades_curriculares: selectedUCsForPI.map(uc => ({
          nomeUC: uc.nomeUC,
          capacidades_tecnicas: uc.capacidades_tecnicas,
          capacidades_socioemocionais: uc.capacidades_socioemocionais,
          technicalOptions: uc.technicalOptions,
          socialOptions: uc.socialOptions,
        })),
      }
    } else {
      // Para estratégias não-PI: criar unidades_curriculares com uma única UC
      situacao = {
        id: Date.now().toString(),
        capacidades_tecnicas: novaSituacao.capacidades_tecnicas || [],
        capacidades_socioemocionais: novaSituacao.capacidades_socioemocionais || [],
        estrategia: novaSituacao.estrategia || "",
        tema_desafio: novaSituacao.tema_desafio || "Tema será gerado automaticamente pela IA",
        carga_horaria: novaSituacao.carga_horaria!,
        unidades_curriculares: selectedUCForSA ? [{
          nomeUC: selectedUCForSA,
          capacidades_tecnicas: novaSituacao.capacidades_tecnicas || [],
          capacidades_socioemocionais: novaSituacao.capacidades_socioemocionais || [],
        }] : undefined,
      }
    }

    setSituacoesAprendizagem([...situacoesAprendizagem, situacao])
    clearFieldError('situacoes')

    // Reset form
    setNovaSituacao({
      capacidades_tecnicas: [],
      capacidades_socioemocionais: [],
      estrategia: "",
      tema_desafio: "",
      carga_horaria: undefined,
    })
    setSelectedUCsForPI([]) // Reset UCs selecionadas para PI
    setSelectedUCForSA("") // Reset UC selecionada para SA padrão
    setTechnicalOptionsForSA([])
    setSocialOptionsForSA([])
    setSituacaoFieldErrors({})

    toast({
      title: "Situação de aprendizagem adicionada",
      description: isProjetoIntegrador
        ? `Projeto Integrador com ${selectedUCsForPI.length} UCs adicionado com sucesso.`
        : "A situação de aprendizagem foi adicionada com sucesso.",
    })
  }

  const removerSituacaoAprendizagem = (id: string) => {
    setSituacoesAprendizagem(situacoesAprendizagem.filter((situacao) => situacao.id !== id))
  }

  const podeAdicionarSituacao = () => {
    return (
      novaSituacao.capacidades_tecnicas &&
      novaSituacao.capacidades_tecnicas.length > 0 &&
      novaSituacao.capacidades_socioemocionais &&
      novaSituacao.capacidades_socioemocionais.length > 0 &&
      novaSituacao.estrategia &&
      novaSituacao.estrategia.trim() !== ""
    )
  }

  // Funções auxiliares para Projeto Integrador (multi-UC)
  const addUCForPI = (ucName: string) => {
    const uc = unidadesCurriculares.find((u) => u.nomeUC === ucName)
    if (uc && !selectedUCsForPI.some((u) => u.nomeUC === ucName)) {
      const technicalCapabilitiesFromUC = uc.capacidades.CapacidadesTecnicas_list || []
      const socialCapabilitiesFromUC = uc.capacidades.CapacidadesSocioemocionais_list || []

      setSelectedUCsForPI([
        ...selectedUCsForPI,
        {
          nomeUC: ucName,
          capacidades_tecnicas: [],
          capacidades_socioemocionais: [],
          technicalOptions: technicalCapabilitiesFromUC.map((cap) => ({ label: cap, value: cap })),
          socialOptions: socialCapabilitiesFromUC.map((cap) => ({ label: cap, value: cap })),
        },
      ])
    }
  }

  const removeUCForPI = (ucName: string) => {
    setSelectedUCsForPI(selectedUCsForPI.filter((u) => u.nomeUC !== ucName))
  }

  const updateUCCapacidades = (
    ucName: string,
    field: "capacidades_tecnicas" | "capacidades_socioemocionais",
    values: string[]
  ) => {
    setSelectedUCsForPI(
      selectedUCsForPI.map((uc) =>
        uc.nomeUC === ucName ? { ...uc, [field]: values } : uc
      )
    )
  }

  const getAvailableUCsForPI = () => {
    return unidadesCurriculares.filter(
      (uc) => !selectedUCsForPI.some((selected) => selected.nomeUC === uc.nomeUC)
    )
  }

  // Handler para seleção de UC na SA (estratégias não-PI)
  const handleSelectUCForSA = (ucName: string) => {
    setSelectedUCForSA(ucName)
    const uc = unidadesCurriculares.find((u) => u.nomeUC === ucName)
    if (uc) {
      const technicalCapabilitiesFromUC = uc.capacidades.CapacidadesTecnicas_list || []
      const socialCapabilitiesFromUC = uc.capacidades.CapacidadesSocioemocionais_list || []
      setTechnicalOptionsForSA(technicalCapabilitiesFromUC.map((cap) => ({ label: cap, value: cap })))
      setSocialOptionsForSA(socialCapabilitiesFromUC.map((cap) => ({ label: cap, value: cap })))
    } else {
      setTechnicalOptionsForSA([])
      setSocialOptionsForSA([])
    }
    // Limpar capacidades selecionadas ao trocar de UC
    setNovaSituacao(prev => ({
      ...prev,
      capacidades_tecnicas: [],
      capacidades_socioemocionais: [],
    }))
    clearSituacaoFieldError('capacidades_tecnicas')
    clearSituacaoFieldError('capacidades_socioemocionais')
    clearSituacaoFieldError('uc')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 sm:p-4 bg-msep-blue/5 border-b flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-medium text-primary">Gerador de Planos de Ensino</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Faça o upload de um plano de curso e preencha os campos para gerar um plano de ensino através da IA Generativa.
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-msep-blue" />
                    <h3 className="text-lg font-medium">Informações do Professor</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="teacherName">Nome do Professor</Label>
                      <Input
                        id="teacherName"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        placeholder="Nome do professor será preenchido automaticamente"
                        disabled={true}
                        className="bg-muted/50 text-foreground border-muted-foreground/20 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="regionalDepartment">Departamento Regional</Label>
                      <Select value={regionalDepartment} onValueChange={(value) => {
                        handleDepartmentChange(value)
                        clearFieldError('regionalDepartment')
                      }}>
                        <SelectTrigger id="regionalDepartment" className={fieldErrors.regionalDepartment ? 'border-red-500 ring-red-500' : ''}>
                          <SelectValue placeholder="Selecione o departamento" />
                        </SelectTrigger>
                        <SelectContent>
                          {brazilianStates.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.regionalDepartment && (
                        <p className="text-sm text-red-500">{fieldErrors.regionalDepartment}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school">Escola</Label>
                      <Select
                        value={school}
                        onValueChange={(value) => {
                          setSchool(value)
                          clearFieldError('school')
                        }}
                        disabled={!regionalDepartment || isFetchingSchools}
                      >
                        <SelectTrigger id="school" className={fieldErrors.school ? 'border-red-500 ring-red-500' : ''}>
                          <SelectValue
                            placeholder={
                              isFetchingSchools
                                ? "Carregando escolas..."
                                : regionalDepartment
                                  ? "Selecione a escola"
                                  : "Selecione um departamento primeiro"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {isFetchingSchools ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">Carregando...</div>
                          ) : schools.length > 0 ? (
                            schools.map((s) => (
                              <SelectItem key={s.id} value={s.nome}>
                                {s.nome}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              Nenhuma escola encontrada para este departamento.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      {fieldErrors.school && (
                        <p className="text-sm text-red-500">{fieldErrors.school}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Upload className="h-5 w-5 text-msep-blue" />
                    <h3 className="text-lg font-medium">Upload de Arquivos</h3>
                  </div>
                  <CoursePlanUpload
                    file={coursePlanFile}
                    onUpload={handleCoursePlanUpload}
                    onProcess={(threadId, courseDetails) => {
                      handleCoursePlanProcess(threadId, courseDetails)
                      clearFieldError('coursePlan')
                    }}
                    processed={coursePlanProcessed}
                    userId={userIdFromSession}
                  />
                  {fieldErrors.coursePlan && (
                    <p className="text-sm text-red-500 mt-2">{fieldErrors.coursePlan}</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="h-5 w-5 text-msep-blue" />
                    <h3 className="text-lg font-medium">Informações do Curso</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="courseName">Nome do Curso</Label>
                      <Input
                        id="courseName"
                        value={courseName}
                        onChange={(e) => setCourseName(e.target.value)}
                        placeholder="Digite o nome do curso"
                        disabled={courseNameLocked}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modalidade">Modalidade</Label>
                      <Select
                        value={modalidade}
                        onValueChange={(value) => {
                          setModalidade(value)
                          clearFieldError('modalidade')
                        }}
                      >
                        <SelectTrigger id="modalidade" className={fieldErrors.modalidade ? 'border-red-500 ring-red-500' : ''}>
                          <SelectValue placeholder="Selecione a modalidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Presencial">Presencial</SelectItem>
                          <SelectItem value="Híbrida">Híbrida</SelectItem>
                          <SelectItem value="Online">Online</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldErrors.modalidade && (
                        <p className="text-sm text-red-500">{fieldErrors.modalidade}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="turma">Turma</Label>
                      <Input
                        id="turma"
                        value={internalTurma}
                        onChange={(e) => {
                          setInternalTurma(e.target.value)
                          clearFieldError('turma')
                        }}
                        placeholder="Digite a turma"
                        className={fieldErrors.turma ? 'border-red-500 ring-red-500' : ''}
                      />
                      {fieldErrors.turma && (
                        <p className="text-sm text-red-500">{fieldErrors.turma}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Data de Início</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          handleStartDateChange(e)
                          clearFieldError('startDate')
                        }}
                        max="9999-12-31"
                        className={fieldErrors.startDate ? 'border-red-500 ring-red-500' : ''}
                      />
                      {fieldErrors.startDate && (
                        <p className="text-sm text-red-500">{fieldErrors.startDate}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">Data de Fim</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          handleEndDateChange(e)
                          clearFieldError('endDate')
                        }}
                        max="9999-12-31"
                        className={fieldErrors.endDate ? 'border-red-500 ring-red-500' : ''}
                      />
                      {fieldErrors.endDate && (
                        <p className="text-sm text-red-500">{fieldErrors.endDate}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="h-5 w-5 text-msep-blue" />
                    <h3 className="text-lg font-medium">Situações de Aprendizagem</h3>
                  </div>
                  <div className={`border rounded-lg p-4 space-y-4 ${fieldErrors.situacoes ? 'border-red-500' : ''}`}>
                    <h4 className="font-medium text-sm">Nova Situação de Aprendizagem</h4>

                    {/* 1. Primeiro: Seletor de Estratégia */}
                    <div className="space-y-2">
                      <Label>Estratégia de Aprendizagem *</Label>
                      <Select
                        value={novaSituacao.estrategia}
                        onValueChange={(value) => {
                          setNovaSituacao({
                            ...novaSituacao,
                            estrategia: value,
                            // Reset capacidades quando muda de estratégia
                            capacidades_tecnicas: [],
                            capacidades_socioemocionais: [],
                          })
                          setSelectedUCsForPI([]) // Reset UCs para PI

                          // Melhoria 1: Pré-selecionar UC da SA anterior (se não for PI)
                          if (value !== "projeto-integrador" && situacoesAprendizagem.length > 0) {
                            // Encontrar a última SA não-PI com UC definida
                            const previousNonPISA = [...situacoesAprendizagem]
                              .reverse()
                              .find(sa => sa.estrategia !== "projeto-integrador" && sa.unidades_curriculares?.[0]?.nomeUC)

                            if (previousNonPISA?.unidades_curriculares?.[0]?.nomeUC) {
                              const ucName = previousNonPISA.unidades_curriculares[0].nomeUC
                              // Pré-selecionar a UC automaticamente
                              handleSelectUCForSA(ucName)
                            } else {
                              setSelectedUCForSA("")
                              setTechnicalOptionsForSA([])
                              setSocialOptionsForSA([])
                            }
                          } else {
                            setSelectedUCForSA("") // Reset UC para SA padrão
                            setTechnicalOptionsForSA([])
                            setSocialOptionsForSA([])
                          }

                          clearSituacaoFieldError('estrategia')
                          clearSituacaoFieldError('capacidades_tecnicas')
                          clearSituacaoFieldError('capacidades_socioemocionais')
                          clearSituacaoFieldError('unidades_curriculares')
                          clearSituacaoFieldError('uc')
                        }}
                      >
                        <SelectTrigger className={situacaoFieldErrors.estrategia ? 'border-red-500 ring-red-500' : ''}>
                          <SelectValue placeholder="Selecione a estratégia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="situacao-problema">Situação-Problema</SelectItem>
                          <SelectItem value="estudo-caso">Estudo de Caso</SelectItem>
                          <SelectItem value="projetos">Projetos</SelectItem>
                          <SelectItem value="pesquisa-aplicada">Pesquisa Aplicada</SelectItem>
                          <SelectItem value="projeto-integrador">Projeto Integrador</SelectItem>
                        </SelectContent>
                      </Select>
                      {situacaoFieldErrors.estrategia && (
                        <p className="text-sm text-red-500">{situacaoFieldErrors.estrategia}</p>
                      )}
                    </div>

                    {/* 2. Segundo: UC e Capacidades (só aparecem após selecionar estratégia) */}
                    {novaSituacao.estrategia && (
                      <>
                        {isProjetoIntegrador ? (
                          <>
                            {/* UI para Projeto Integrador - Múltiplas UCs */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Label className="text-base font-medium">Unidades Curriculares Integradas</Label>
                                <Badge variant="outline" className="text-xs">
                                  {selectedUCsForPI.length} UC{selectedUCsForPI.length !== 1 ? 's' : ''} selecionada{selectedUCsForPI.length !== 1 ? 's' : ''}
                                </Badge>
                              </div>

                              {/* Seletor para adicionar nova UC */}
                              <div className="flex gap-2">
                                <Select
                                  onValueChange={(value) => addUCForPI(value)}
                                  disabled={unidadesCurriculares.length === 0}
                                >
                                  <SelectTrigger className="flex-1">
                                    <SelectValue
                                      placeholder={
                                        unidadesCurriculares.length === 0
                                          ? "Processe o plano de curso para ver as UCs"
                                          : getAvailableUCsForPI().length === 0
                                            ? "Todas as UCs já foram adicionadas"
                                            : "Adicionar Unidade Curricular"
                                      }
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getAvailableUCsForPI().map((uc, index) => (
                                      <SelectItem key={index} value={uc.nomeUC}>
                                        {uc.nomeUC}{uc.carga_horaria_total ? ` (${uc.carga_horaria_total})` : ''}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Exibir badges das UCs selecionadas */}
                              {selectedUCsForPI.length > 0 && (
                                <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-md">
                                  {selectedUCsForPI.map((uc) => (
                                    <Badge key={uc.nomeUC} variant="secondary" className="text-xs">
                                      {uc.nomeUC}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {/* Lista de UCs selecionadas com capacidades */}
                              {selectedUCsForPI.length > 0 && (
                                <div className="space-y-4">
                                  {selectedUCsForPI.map((uc, index) => (
                                    <Card key={uc.nomeUC} className="border-l-4 border-l-msep-blue">
                                      <CardHeader className="pb-2">
                                        <div className="flex justify-between items-center">
                                          <CardTitle className="text-sm font-medium">{uc.nomeUC}</CardTitle>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive hover:text-destructive"
                                            onClick={() => removeUCForPI(uc.nomeUC)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </CardHeader>
                                      <CardContent className="space-y-3 pt-0">
                                        <div className="space-y-2">
                                          <Label className="text-xs">Capacidades Técnicas</Label>
                                          <MultiSelect
                                            options={uc.technicalOptions}
                                            selected={uc.capacidades_tecnicas}
                                            onChange={(selected) => updateUCCapacidades(uc.nomeUC, "capacidades_tecnicas", selected)}
                                            placeholder="Selecione as capacidades técnicas"
                                            emptyMessage="Nenhuma capacidade técnica disponível."
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label className="text-xs">Capacidades Socioemocionais</Label>
                                          <MultiSelect
                                            options={uc.socialOptions}
                                            selected={uc.capacidades_socioemocionais}
                                            onChange={(selected) => updateUCCapacidades(uc.nomeUC, "capacidades_socioemocionais", selected)}
                                            placeholder="Selecione as capacidades socioemocionais"
                                            emptyMessage="Nenhuma capacidade socioemocional disponível."
                                          />
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              )}

                              {situacaoFieldErrors.unidades_curriculares && (
                                <p className="text-sm text-red-500">{situacaoFieldErrors.unidades_curriculares}</p>
                              )}

                              {selectedUCsForPI.length < 2 && (
                                <p className="text-sm text-muted-foreground">
                                  Projeto Integrador requer pelo menos 2 unidades curriculares.
                                </p>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            {/* UI padrão - Uma UC selecionada por SA */}
                            <div className="space-y-2">
                              <Label>Unidade Curricular *</Label>
                              <Select
                                value={selectedUCForSA}
                                onValueChange={handleSelectUCForSA}
                                disabled={situacoesAprendizagem.some(sa => sa.estrategia !== "projeto-integrador" && sa.unidades_curriculares?.[0]?.nomeUC)}
                              >
                                <SelectTrigger className={situacaoFieldErrors.uc ? 'border-red-500 ring-red-500' : ''}>
                                  <SelectValue placeholder="Selecione a unidade curricular para esta SA" />
                                </SelectTrigger>
                                <SelectContent>
                                  {unidadesCurriculares.map((uc, index) => (
                                    <SelectItem key={index} value={uc.nomeUC}>
                                      {uc.nomeUC}{uc.carga_horaria_total ? ` (${uc.carga_horaria_total})` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {situacaoFieldErrors.uc && (
                                <p className="text-sm text-red-500">{situacaoFieldErrors.uc}</p>
                              )}
                            </div>
                            {selectedUCForSA && (
                              <>
                                <div className="space-y-2">
                                  <Label>Capacidades Técnicas</Label>
                                  <MultiSelect
                                    options={technicalOptionsForSA}
                                    selected={novaSituacao.capacidades_tecnicas || []}
                                    onChange={(selected) => {
                                      setNovaSituacao({ ...novaSituacao, capacidades_tecnicas: selected })
                                      clearSituacaoFieldError('capacidades_tecnicas')
                                    }}
                                    placeholder="Selecione as capacidades técnicas"
                                    emptyMessage="Nenhuma capacidade técnica encontrada para esta unidade curricular."
                                    className={situacaoFieldErrors.capacidades_tecnicas ? 'border-red-500 ring-red-500' : ''}
                                  />
                                  {situacaoFieldErrors.capacidades_tecnicas && (
                                    <p className="text-sm text-red-500">{situacaoFieldErrors.capacidades_tecnicas}</p>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <Label>Capacidades Socioemocionais</Label>
                                  <MultiSelect
                                    options={socialOptionsForSA}
                                    selected={novaSituacao.capacidades_socioemocionais || []}
                                    onChange={(selected) => {
                                      setNovaSituacao({ ...novaSituacao, capacidades_socioemocionais: selected })
                                      clearSituacaoFieldError('capacidades_socioemocionais')
                                    }}
                                    placeholder="Selecione as capacidades socioemocionais"
                                    emptyMessage="Nenhuma capacidade socioemocional encontrada para esta unidade curricular."
                                    className={situacaoFieldErrors.capacidades_socioemocionais ? 'border-red-500 ring-red-500' : ''}
                                  />
                                  {situacaoFieldErrors.capacidades_socioemocionais && (
                                    <p className="text-sm text-red-500">{situacaoFieldErrors.capacidades_socioemocionais}</p>
                                  )}
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </>
                    )}
                    <div className="space-y-2">
                      <Label>Tema do Desafio</Label>
                      <Textarea
                        value={novaSituacao.tema_desafio}
                        onChange={(e) => setNovaSituacao({ ...novaSituacao, tema_desafio: e.target.value })}
                        placeholder="Descreva o tema do desafio (opcional - será gerado automaticamente se não preenchido)"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="carga_horaria">Carga Horária da SA (horas) *</Label>
                      <Input
                        id="carga_horaria"
                        type="number"
                        min={0.1}
                        step="any"
                        max={500}
                        value={novaSituacao.carga_horaria ?? ""}
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : undefined
                          setNovaSituacao({
                            ...novaSituacao,
                            carga_horaria: value
                          })
                          clearSituacaoFieldError('carga_horaria')
                        }}
                        placeholder="Informe a carga horária em horas"
                        className={situacaoFieldErrors.carga_horaria ? 'border-red-500 ring-red-500' : ''}
                      />
                      {situacaoFieldErrors.carga_horaria && (
                        <p className="text-sm text-red-500">{situacaoFieldErrors.carga_horaria}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        A quantidade de horas define quantas linhas terá o cronograma de aulas.
                      </p>
                    </div>
                    <Button
                      onClick={adicionarSituacaoAprendizagem}
                      className="mt-5 w-full bg-primary hover:bg-primary/90"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Situação de Aprendizagem
                    </Button>
                  </div>
                  {situacoesAprendizagem.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Situações de Aprendizagem Criadas</h4>
                      {situacoesAprendizagem.map((situacao, index) => (
                        <Card key={situacao.id} className="border-l-4 border-l-msep-blue">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start flex-wrap">
                              <CardTitle className="text-sm">Situação {index + 1}</CardTitle>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => removerSituacaoAprendizagem(situacao.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="bg-msep-blue/15 text-msep-blue border border-msep-blue/30">
                                {situacao.estrategia === "projeto-integrador" ? "Projeto Integrador" : situacao.estrategia}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {situacao.carga_horaria}h
                              </Badge>
                              {situacao.unidades_curriculares && situacao.unidades_curriculares.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {situacao.unidades_curriculares.length} UCs
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium">{situacao.tema_desafio}</p>

                            {/* Mostrar UCs integradas para Projeto Integrador */}
                            {situacao.unidades_curriculares && situacao.unidades_curriculares.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground">Unidades Curriculares Integradas:</p>
                                {situacao.unidades_curriculares.map((uc, ucIndex) => (
                                  <div key={ucIndex} className="pl-2 border-l-2 border-msep-blue/30 text-xs text-muted-foreground">
                                    <p className="font-medium text-foreground">{uc.nomeUC}</p>
                                    <p><strong>Técnicas:</strong> {uc.capacidades_tecnicas.join(", ")}</p>
                                    <p><strong>Socioem.:</strong> {uc.capacidades_socioemocionais.join(", ")}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                <p>
                                  <strong>Capacidades Técnicas:</strong> {situacao.capacidades_tecnicas.join(", ")}
                                </p>
                                <p>
                                  <strong>Capacidades Socioemocionais:</strong>{" "}
                                  {situacao.capacidades_socioemocionais.join(", ")}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  {fieldErrors.situacoes && situacoesAprendizagem.length === 0 && (
                    <p className="text-sm text-red-500">{fieldErrors.situacoes}</p>
                  )}
                  {fieldErrors.capacidadesTecnicas && (
                    <p className="text-sm text-red-500">{fieldErrors.capacidadesTecnicas}</p>
                  )}
                  {fieldErrors.capacidadesSocioemocionais && (
                    <p className="text-sm text-red-500">{fieldErrors.capacidadesSocioemocionais}</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className={fieldErrors.schedule ? 'border-red-500' : ''}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-5 w-5 text-msep-blue" />
                    <h3 className="text-lg font-medium">Calendário de Aulas</h3>
                  </div>
                  <ScheduleBuilder schedule={schedule} setSchedule={(newSchedule) => {
                    setSchedule(newSchedule)
                    if (newSchedule.length > 0) {
                      clearFieldError('schedule')
                    }
                  }} />
                  {fieldErrors.schedule && (
                    <p className="text-sm text-red-500">{fieldErrors.schedule}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div >
      <div className="p-4 border-t bg-background">
        <Button
          onClick={generateTeachingPlan}
          className="w-full font-medium py-6 bg-primary hover:bg-primary/90 text-primary-foreground"
          size="lg"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Gerando Plano de Ensino...
            </>
          ) : (
            <>
              <FileText className="h-5 w-5 mr-2" />
              Gerar Plano de Ensino
            </>
          )}
        </Button>
      </div>

      {/* Dialog de aviso para capacidades faltantes */}
      <ConfirmationDialog
        open={isCapabilityWarningDialogOpen}
        onOpenChange={setIsCapabilityWarningDialogOpen}
        title="Atenção: Capacidades Não Selecionadas"
        description={`Algumas capacidades do plano de curso não foram selecionadas nas situações de aprendizagem:\n\n${pendingCapabilityWarnings.tecnicas.length > 0
          ? `• ${pendingCapabilityWarnings.tecnicas.length} capacidade(s) técnica(s) faltante(s)\n`
          : ''
          }${pendingCapabilityWarnings.socioemocionais.length > 0
            ? `• ${pendingCapabilityWarnings.socioemocionais.length} capacidade(s) socioemocional(is) faltante(s)`
            : ''
          }\n\nDeseja continuar mesmo assim?`}
        confirmLabel="Sim, gerar plano mesmo assim"
        cancelLabel="Não, voltar e ajustar"
        onConfirm={async () => {
          setIsCapabilityWarningDialogOpen(false)
          await doGeneratePlan()
        }}
        variant="default"
      />
    </div >
  )
}
