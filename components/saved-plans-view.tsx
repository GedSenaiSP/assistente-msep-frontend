"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import {
  ChevronLeft, BookOpen, Users, GraduationCap, Loader2, FileText, Sparkles, Calendar,
  MoreVertical, Archive, Share2, Trash2, ArchiveRestore, X, CheckCircle, RotateCcw, Send, Globe, Lock, Eye,
  BookText, Edit
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  getUserPlans, getSinglePlan, mapSummaryToPlanInfo, type PlanInfo,
  type SinglePlanResponse, exportPlanToDocx, updatePlanArchiveState, updatePlanStatus,
  type PlanStatusType, GetPlansResponse, getPublicPlans, togglePlanPublic,
  getPlanPreviewUrl
} from "@/services/api"
import { DocxPreviewModal } from "@/components/docx-preview-modal"
import { toast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useApp } from "@/contexts/app-context"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { Combobox } from "@/components/ui/combobox"
import { GenerateResourceModal } from "@/components/generate-resource-modal"
import { StatusCommentDialog } from "@/components/status-comment-dialog"
import { StatusHistoryPanel } from "@/components/status-history-panel"
import { ManualEditForm } from "@/components/manual-edit-form"

interface SavedPlansViewProps {
  generatePlan: () => void
  planIdToSelect?: string | null
  onPlanSelected?: () => void // Callback para limpar o estado após seleção
}

interface PlanWithId extends PlanInfo {
  arquivado: boolean
  fullData?: SinglePlanResponse
  departamento_regional: string | null;
  docente: string | null;
  status: PlanStatusType;
  publico: boolean;
  // Token metrics
  input_tokens: number | null;
  output_tokens: number | null;
}

// Configuração de cores e labels para cada status
const statusConfig = {
  gerado: { label: "Gerado", className: "bg-gray-100 text-gray-700 border-gray-300" },
  submetido: { label: "Aguardando Aprovação", className: "bg-blue-100 text-blue-700 border-blue-300" },
  retornado: { label: "Retornado para Revisão", className: "bg-amber-100 text-amber-700 border-amber-300" },
  aprovado: { label: "Aprovado", className: "bg-green-100 text-green-700 border-green-300" },
}

// Componente de Badge de Status
const StatusBadge = ({ status }: { status: PlanStatusType }) => {
  const config = statusConfig[status] || statusConfig.gerado
  return <Badge variant="outline" className={`${config.className} font-medium`}>{config.label}</Badge>
}

// Componente de Badge de Visibilidade (Público/Privado)
const VisibilityBadge = ({ publico }: { publico: boolean }) => {
  if (publico) {
    return (
      <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 font-medium">
        <Globe className="h-3 w-3 mr-1" /> Público
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 font-medium">
      <Lock className="h-3 w-3 mr-1" /> Privado
    </Badge>
  )
}

export function SavedPlansView({ generatePlan, planIdToSelect, onPlanSelected }: SavedPlansViewProps) {
  const router = useRouter()
  const { switchToConversation, userRole, userSchool, conversations } = useApp()
  const { data: session } = useSession()
  const [plans, setPlans] = useState<PlanWithId[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<PlanWithId | null>(null)
  const [plansLoaded, setPlansLoaded] = useState(false)
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null)
  const [isArchiving, setIsArchiving] = useState<string | null>(null)
  const [resourceModalPlan, setResourceModalPlan] = useState<PlanWithId | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null)
  const [publicPlans, setPublicPlans] = useState<PlanWithId[]>([])
  const [isTogglingPublic, setIsTogglingPublic] = useState<string | null>(null)
  const [loadingPublicPlans, setLoadingPublicPlans] = useState(true)
  const [pendingPlans, setPendingPlans] = useState<PlanWithId[]>([])
  const [loadingPendingPlans, setLoadingPendingPlans] = useState(false)

  // Edit State
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)

  // State for comment dialog
  const [commentDialogOpen, setCommentDialogOpen] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState<{ planId: string; newStatus: PlanStatusType } | null>(null)
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0)

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState("")
  const [previewTitle, setPreviewTitle] = useState("")

  // State for filters
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [filteredPlans, setFilteredPlans] = useState<PlanWithId[]>([]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    const user = session?.user;
    if (user && userRole && !plansLoaded) {
      loadUserPlans(user, userRole);
      loadPublicPlans();
      if (userRole === "coordenador") {
        loadPendingPlans(user);
      }
      setPlansLoaded(true);
    } else if (!user) {
      setLoading(false);
      setLoadingPublicPlans(false);
    }
  }, [session, userRole, plansLoaded]);

  // Auto-select plan when planIdToSelect changes
  useEffect(() => {
    if (planIdToSelect && plans.length > 0) {
      const planToSelect = plans.find(p => p.id === planIdToSelect)
      if (planToSelect) {
        handlePlanClick(planToSelect)
        // Limpa o estado após selecionar para não reabrir toda vez
        if (onPlanSelected) {
          onPlanSelected()
        }
      }
    }
  }, [planIdToSelect, plans])

  const loadUserPlans = async (user: any, role: string) => {
    try {
      setLoading(true);
      let filters = {};
      if (role === "administracao_regional" && user.departamento_regional) {
        filters = { department: user.departamento_regional };
      } else if (role === "coordenador" && userSchool) {
        filters = { school: userSchool };
      }

      const response = await getUserPlans(user.id, filters);

      if (!response.plans || response.plans.length === 0) {
        setPlans([]);
        return;
      }
      const summaryPlans: PlanWithId[] = response.plans.map((summary) => ({
        ...mapSummaryToPlanInfo(summary),
        departamento_regional: summary.departamento_regional,
        docente: summary.docente,
        arquivado: summary.arquivado ?? false,
        status: (summary.status as PlanStatusType) || "gerado",
        publico: summary.publico ?? false,
        input_tokens: summary.input_tokens ?? null,
        output_tokens: summary.output_tokens ?? null,
        fullData: undefined,
      }));
      setPlans(summaryPlans);
    } catch (error) {
      console.error("Erro ao carregar a lista de planos:", error);
      toast({
        title: "Erro ao carregar planos",
        description: "Não foi possível buscar a lista de planos salvos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };



  const loadPendingPlans = async (user: any) => {
    if (!userSchool) return

    try {
      setLoadingPendingPlans(true)
      const response = await getUserPlans(user.id, {
        school: userSchool,
        status: 'submetido'
      })

      if (response.plans && response.plans.length > 0) {
        const summaryPlans: PlanWithId[] = response.plans.map((summary) => ({
          ...mapSummaryToPlanInfo(summary),
          departamento_regional: summary.departamento_regional,
          docente: summary.docente,
          arquivado: summary.arquivado ?? false,
          status: (summary.status as PlanStatusType) || "submetido",
          publico: summary.publico ?? false,
          input_tokens: summary.input_tokens ?? null,
          output_tokens: summary.output_tokens ?? null,
          fullData: undefined,
        }))
        setPendingPlans(summaryPlans)
      } else {
        setPendingPlans([])
      }
    } catch (error) {
      console.error("Erro ao carregar planos pendentes:", error)
    } finally {
      setLoadingPendingPlans(false)
    }
  }

  const loadPublicPlans = async () => {
    try {
      setLoadingPublicPlans(true);
      const response = await getPublicPlans();

      if (!response.plans || response.plans.length === 0) {
        setPublicPlans([]);
        return;
      }
      const summaryPlans: PlanWithId[] = response.plans.map((summary) => ({
        ...mapSummaryToPlanInfo(summary),
        departamento_regional: summary.departamento_regional,
        docente: summary.docente,
        arquivado: summary.arquivado ?? false,
        status: (summary.status as PlanStatusType) || "gerado",
        publico: summary.publico ?? false,
        input_tokens: summary.input_tokens ?? null,
        output_tokens: summary.output_tokens ?? null,
        fullData: undefined,
      }));
      setPublicPlans(summaryPlans);
    } catch (error) {
      console.error("Erro ao carregar planos públicos:", error);
    } finally {
      setLoadingPublicPlans(false);
    }
  };
  const { departmentOptions, schoolOptions, teacherOptions, courseOptions } = useMemo(() => {
    const departments = [...new Set(plans.map(p => p.departamento_regional).filter(Boolean))].sort();

    const filteredByDept = selectedDepartment === 'all' ? plans : plans.filter(p => p.departamento_regional === selectedDepartment);
    const schools = [...new Set(filteredByDept.map(p => p.escola).filter(Boolean))].sort();

    const filteredBySchool = selectedSchool === 'all' ? filteredByDept : filteredByDept.filter(p => p.escola === selectedSchool);
    const teachers = [...new Set(filteredBySchool.map(p => p.docente).filter(Boolean))].sort();

    const filteredByTeacher = selectedTeacher === 'all' ? filteredBySchool : filteredBySchool.filter(p => p.docente === selectedTeacher);
    const courses = [...new Set(filteredByTeacher.map(p => p.curso).filter(Boolean))].sort();

    return {
      departmentOptions: departments,
      schoolOptions: schools,
      teacherOptions: teachers,
      courseOptions: courses,
    };
  }, [plans, selectedDepartment, selectedSchool, selectedTeacher]);

  useEffect(() => {
    let result = plans;
    if (selectedDepartment !== 'all') {
      result = result.filter(p => p.departamento_regional === selectedDepartment);
    }
    if (selectedSchool !== 'all') {
      result = result.filter(p => p.escola === selectedSchool);
    }
    if (selectedTeacher !== 'all') {
      result = result.filter(p => p.docente === selectedTeacher);
    }
    if (selectedCourse !== 'all') {
      result = result.filter(p => p.curso === selectedCourse);
    }
    setFilteredPlans(result);
  }, [plans, selectedDepartment, selectedSchool, selectedTeacher, selectedCourse]);


  const handleExport = async (planId: string, turma: string, unidadeCurricular: string) => {
    setIsExporting(planId)
    try {
      await exportPlanToDocx(planId, turma, unidadeCurricular)
      toast({
        title: "Exportação bem-sucedida",
        description: "O download do arquivo .docx foi iniciado.",
      })
    } catch (error) {
      console.error("Erro ao exportar plano:", error)
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível gerar o arquivo do plano. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(null)
    }
  }

  const handleArchiveToggle = async (planId: string, currentArchivedState: boolean) => {
    setIsArchiving(planId)
    try {
      const newArchivedState = !currentArchivedState
      await updatePlanArchiveState(planId, newArchivedState)

      setPlans(prevPlans =>
        prevPlans.map(p => p.id === planId ? { ...p, arquivado: newArchivedState } : p)
      )

      toast({
        title: `Plano ${newArchivedState ? 'arquivado' : 'desarquivado'} com sucesso!`,
        description: `O plano foi movido para a aba '${newArchivedState ? 'Arquivados' : 'Ativos'}'.`,
      })
    } catch (error) {
      console.error("Erro ao alterar o estado do plano:", error)
      toast({
        title: "Erro ao atualizar plano",
        description: "Não foi possível alterar o estado do plano.",
        variant: "destructive",
      })
    } finally {
      setIsArchiving(null)
    }
  }

  // Handler para abrir o diálogo de comentário antes de atualizar status
  const handleStatusUpdate = (planId: string, newStatus: PlanStatusType) => {
    setPendingStatusChange({ planId, newStatus })
    setCommentDialogOpen(true)
  }

  // Handler para confirmar a mudança de status com comentário
  const confirmStatusUpdate = async (comment: string) => {
    if (!pendingStatusChange || !session?.user?.id) return

    const { planId, newStatus } = pendingStatusChange
    setIsUpdatingStatus(planId)
    setCommentDialogOpen(false)

    try {
      await updatePlanStatus(planId, newStatus, session.user.id, comment)

      setPlans(prevPlans =>
        prevPlans.map(p => p.id === planId ? { ...p, status: newStatus } : p)
      )

      // Atualiza o selectedPlan se estiver aberto
      if (selectedPlan && selectedPlan.id === planId) {
        setSelectedPlan({ ...selectedPlan, status: newStatus })
      }

      // Atualiza também a lista de pendentes se for coordenador
      if (userRole === "coordenador") {
        setPendingPlans(prev => prev.filter(p => p.id !== planId || newStatus === "submetido"))
      }

      // Trigger refresh do histórico
      setHistoryRefreshTrigger(prev => prev + 1)

      const statusMessages = {
        aprovado: "Plano aprovado com sucesso!",
        retornado: "Plano retornado para revisão.",
        submetido: "Plano submetido para aprovação.",
        gerado: "Status do plano atualizado.",
      }

      toast({
        title: statusMessages[newStatus] || "Status atualizado",
        description: `O status do plano foi alterado para "${statusConfig[newStatus].label}".`,
      })
    } catch (error) {
      console.error("Erro ao atualizar status do plano:", error)
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status do plano.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingStatus(null)
      setPendingStatusChange(null)
    }
  }

  const handlePlanClick = async (plan: PlanWithId) => {
    if (plan.fullData) {
      setSelectedPlan(plan)
      return
    }
    setLoadingDetails(plan.id)
    try {
      const fullData = await getSinglePlan(plan.id)
      const updatedPlan = { ...plan, fullData }
      setPlans(prevPlans => prevPlans.map(p => p.id === plan.id ? updatedPlan : p));
      setSelectedPlan(updatedPlan);
    } catch (error) {
      console.error(`Erro ao carregar detalhes do plano ${plan.id}:`, error)
      toast({
        title: "Erro ao carregar detalhes",
        description: "Não foi possível buscar os detalhes completos deste plano.",
        variant: "destructive",
      })
    } finally {
      setLoadingDetails(null)
    }
  }

  const handleBackToList = () => {
    setSelectedPlan(null)
  }

  // Handler para alternar visibilidade pública do plano
  const handleTogglePublic = async (planId: string, currentPublicState: boolean) => {
    setIsTogglingPublic(planId)
    try {
      const result = await togglePlanPublic(planId)
      const newPublicState = result.publico

      setPlans(prevPlans =>
        prevPlans.map(p => p.id === planId ? { ...p, publico: newPublicState } : p)
      )

      // Atualiza o selectedPlan se estiver aberto
      if (selectedPlan && selectedPlan.id === planId) {
        setSelectedPlan({ ...selectedPlan, publico: newPublicState })
      }

      // Recarrega planos públicos
      loadPublicPlans()

      toast({
        title: newPublicState ? "Plano compartilhado!" : "Plano tornado privado",
        description: newPublicState
          ? "Seu plano agora está visível para outros docentes na aba 'Públicos'."
          : "Seu plano foi removido da lista de planos públicos.",
      })
    } catch (error: any) {
      console.error("Erro ao alternar visibilidade do plano:", error)
      toast({
        title: "Erro ao compartilhar",
        description: error.message || "Não foi possível alterar a visibilidade do plano.",
        variant: "destructive",
      })
    } finally {
      setIsTogglingPublic(null)
    }
  }

  // Função para abrir modal de recursos didáticos (carrega dados se necessário)
  const handleOpenResourceModal = async (plan: PlanWithId) => {
    if (plan.fullData) {
      setResourceModalPlan(plan)
      return
    }
    setLoadingDetails(plan.id)
    try {
      const fullData = await getSinglePlan(plan.id)
      const updatedPlan = { ...plan, fullData }
      setPlans(prevPlans => prevPlans.map(p => p.id === plan.id ? updatedPlan : p))
      setResourceModalPlan(updatedPlan)
    } catch (error) {
      console.error(`Erro ao carregar detalhes do plano ${plan.id}:`, error)
      toast({
        title: "Erro ao carregar detalhes",
        description: "Não foi possível carregar os dados do plano.",
        variant: "destructive",
      })
    } finally {
      setLoadingDetails(null)
    }
  }

  const activePlans = filteredPlans.filter(p => !p.arquivado)
  const archivedPlans = filteredPlans.filter(p => p.arquivado)

  const groupPlansByStructure = (plans: PlanWithId[]) => {
    const grouped = {};
    plans.forEach(plan => {
      const dep = plan.departamento_regional || 'Departamento não informado';
      const school = plan.escola || 'Escola não informada';
      const course = plan.curso || 'Curso não informado';
      const uc = plan.unidadeCurricular || 'Unidade Curricular não informada';
      const teacher = plan.docente || 'Docente não informado';

      if (!grouped[dep]) grouped[dep] = {};
      if (!grouped[dep][school]) grouped[dep][school] = {};
      if (!grouped[dep][school][course]) grouped[dep][school][course] = {};
      if (!grouped[dep][school][course][uc]) grouped[dep][school][course][uc] = {};
      if (!grouped[dep][school][course][uc][teacher]) grouped[dep][school][course][uc][teacher] = [];

      grouped[dep][school][course][uc][teacher].push(plan);
    });
    return grouped;
  };

  const renderCards = (planList: PlanWithId[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
      {planList.map((plan) => (
        <Card
          key={plan.id}
          className="flex flex-col justify-between border-l-4 border-msep-blue hover:shadow-lg transition-shadow relative"
        >
          {(loadingDetails === plan.id || isArchiving === plan.id || isUpdatingStatus === plan.id || isTogglingPublic === plan.id) && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg z-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          <div className="flex-grow">
            <CardHeader className="flex-row items-start justify-between">
              <div className="cursor-pointer flex-grow" onClick={() => handlePlanClick(plan)}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <StatusBadge status={plan.status} />
                  {plan.status === "aprovado" && <VisibilityBadge publico={plan.publico} />}
                </div>
                <CardTitle className="text-base text-primary line-clamp-2">{plan.unidadeCurricular}</CardTitle>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 -mr-2 -mt-2">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleExport(plan.id, plan.turma, plan.unidadeCurricular)}
                    disabled={isExporting === plan.id}
                  >
                    {isExporting === plan.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                    Exportar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setPreviewUrl(getPlanPreviewUrl(plan.id))
                      setPreviewTitle(plan.unidadeCurricular)
                      setPreviewOpen(true)
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleArchiveToggle(plan.id, plan.arquivado)}>
                    {plan.arquivado ? <ArchiveRestore className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
                    {plan.arquivado ? 'Desarquivar' : 'Arquivar'}
                  </DropdownMenuItem>

                  {/* Botões para Docente - Submeter para aprovação */}
                  {userRole === "docente" && plan.status !== "aprovado" && plan.status !== "submetido" && (
                    <DropdownMenuItem
                      onClick={() => handleStatusUpdate(plan.id, "submetido")}
                      className="text-blue-600"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Submeter para Aprovação
                    </DropdownMenuItem>
                  )}

                  {/* Botões para Coordenador - Aprovar ou Retornar */}
                  {userRole === "coordenador" && plan.status !== "aprovado" && (
                    <>
                      <DropdownMenuItem
                        onClick={() => handleStatusUpdate(plan.id, "aprovado")}
                        className="text-green-600"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprovar Plano
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusUpdate(plan.id, "retornado")}
                        className="text-amber-600"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Retornar para Revisão
                      </DropdownMenuItem>
                    </>
                  )}

                  {/* Botão de Compartilhar - apenas para planos aprovados */}
                  <DropdownMenuItem
                    onClick={() => handleTogglePublic(plan.id, plan.publico)}
                    disabled={plan.status !== "aprovado"}
                    className={plan.status === "aprovado" ? "text-purple-600" : ""}
                  >
                    {plan.publico ? <Lock className="h-4 w-4 mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
                    {plan.publico ? "Tornar Privado" : "Tornar Público"}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="text-red-500">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Apagar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEditingPlanId(plan.id)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Manualmente
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem onClick={() => handleOpenResourceModal(plan)}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Gerar Recurso Didático
                  </DropdownMenuItem> */}
                  {/* <DropdownMenuItem onClick={() => window.open('https://geradordeapostila.senai.br/', '_blank')}>
                    <BookText className="h-4 w-4 mr-2" />
                    Gerar Apostila
                  </DropdownMenuItem> */}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <div className="cursor-pointer flex-grow" onClick={() => handlePlanClick(plan)}>
              <CardContent className="space-y-3 text-sm -mt-4">
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground"><strong>Turma:</strong> {plan.turma}</span>
                </div>
                <div className="flex items-start gap-2">
                  <GraduationCap className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground"><strong>Escola:</strong> {plan.escola}</span>
                </div>
                <div className="flex items-start gap-2">
                  <BookOpen className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground line-clamp-2">
                    <strong>Situações de Aprendizagem:</strong> {plan.quantidadeSituacoes} ({plan.tiposSituacoes.join(", ")})
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground">
                    <strong>Período:</strong> {formatDate(plan.data_inicio)} a {formatDate(plan.data_fim)}
                  </span>
                </div>
                {(plan.input_tokens || plan.output_tokens) && (
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground text-xs">
                      <strong>Tokens:</strong> {(plan.input_tokens || 0).toLocaleString()} entrada / {(plan.output_tokens || 0).toLocaleString()} saída
                    </span>
                  </div>
                )}
              </CardContent>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const getCount = (obj: any): number => {
    if (Array.isArray(obj)) return obj.length;
    return Object.values(obj).reduce((sum: number, value) => sum + getCount(value), 0) as number;
  }

  const getAllAccordionKeys = (data: any, level = 0): string[] => {
    if (Array.isArray(data)) {
      return [];
    }
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return [];
    }
    return keys.flatMap(key => {
      const currentKey = `${key}-${level}`;
      const childKeys = getAllAccordionKeys(data[key], level + 1);
      return [currentKey, ...childKeys];
    });
  }

  const renderGroupRecursively = (data: any, level = 0, allKeys: string[] = []) => {
    const groupLabels = ["Departamento Regional", "Escola", "Curso", "Unidade Curricular", "Docente"];

    if (Array.isArray(data)) {
      return renderCards(data);
    }

    const keys = Object.keys(data);
    if (keys.length === 0) {
      return null;
    }

    return (
      <Accordion type="multiple" className="w-full" style={{ paddingLeft: level > 0 ? '1rem' : '0' }} defaultValue={allKeys}>
        {keys.map(key => (
          <AccordionItem value={`${key}-${level}`} key={`${key}-${level}`}>
            <AccordionTrigger>{groupLabels[level]}: {key} ({getCount(data[key])} planos)</AccordionTrigger>
            <AccordionContent>
              {renderGroupRecursively(data[key], level + 1, allKeys)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  };

  const renderPlanList = (planList: PlanWithId[], emptyMessage: string) => {
    const isAdmin = userRole === 'administracao_regional' || userRole === 'administracao_nacional';

    if (planList.length === 0) {
      return (
        <div className="text-center py-16">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground mb-4">{emptyMessage}</p>
          {plans.length === 0 && (
            <Button onClick={generatePlan} className="bg-msep-blue text-white hover:bg-msep-blue/90">
              Gerar Novo Plano
            </Button>
          )}
        </div>
      )
    }

    if (isAdmin) {
      const grouped = groupPlansByStructure(planList);
      const allKeys = getAllAccordionKeys(grouped);
      return renderGroupRecursively(grouped, 0, allKeys);
    }

    return renderCards(planList);
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando seus planos salvos...</p>
      </div>
    )
  }

  if (editingPlanId) {
    return (
      <div className="h-full">
        <ManualEditForm
          planId={editingPlanId}
          userId={session?.user?.id || ""}
          onCancel={() => setEditingPlanId(null)}
          onSaveSuccess={(newId) => {
            setEditingPlanId(null)
            loadUserPlans(session?.user, userRole || "") // Reload list

            // Refresh conversations list to show the new manual plan thread
            if (session?.user?.id) {
              conversations.loadUserConversations(session.user.id)
            }

            // Optionally select the new plan if newId is returned
          }}
        />
      </div>
    )
  }

  if (selectedPlan) {
    const { plano_de_ensino } = selectedPlan.fullData.plan_content
    const informacoesCurso = plano_de_ensino.informacoes_curso
    const situacoesAprendizagem = plano_de_ensino.situacoes_aprendizagem

    const renderConhecimentos = (items: any[], level = 0) => (
      <ul className={`space-y-1 ${level > 0 ? "pl-4" : ""}`}>
        {items.map((item, index) => (
          <li key={index} className="text-sm text-muted-foreground">
            <span className="font-semibold">{item.topico || item.descricao}</span>
            {item.subtopicos && item.subtopicos.length > 0 && renderConhecimentos(item.subtopicos, level + 1)}
          </li>
        ))}
      </ul>
    )

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 bg-background z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Button size="sm" onClick={handleBackToList} className="bg-msep-blue text-white hover:bg-msep-blue/90 mb-2 sm:mb-0">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-2 max-w-full">
              <StatusBadge status={selectedPlan.status} />
              <h2 className="text-base sm:text-lg font-medium text-primary truncate max-w-[200px] sm:max-w-md" title={informacoesCurso.unidade_curricular}>
                {informacoesCurso.unidade_curricular}
              </h2>
            </div>
          </div>
          {/* Actions Toolbar - Responsive */}
          <div className="flex items-center gap-2">
            {/* Desktop Buttons */}
            <div className="hidden md:flex items-center gap-2">
              {/* Botões de aprovação para Coordenador */}
              {userRole === "coordenador" && selectedPlan.status !== "aprovado" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleStatusUpdate(selectedPlan.id, "aprovado")}
                    className="bg-green-600 text-white hover:bg-green-700"
                    disabled={isUpdatingStatus === selectedPlan.id}
                  >
                    {isUpdatingStatus === selectedPlan.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleStatusUpdate(selectedPlan.id, "retornado")}
                    className="bg-amber-500 text-white hover:bg-amber-600"
                    disabled={isUpdatingStatus === selectedPlan.id}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retornar
                  </Button>
                </>
              )}

              {/* Botão de submissão para Docente */}
              {userRole === "docente" && selectedPlan.status !== "aprovado" && selectedPlan.status !== "submetido" && (
                <Button
                  size="sm"
                  onClick={() => handleStatusUpdate(selectedPlan.id, "submetido")}
                  className="bg-msep-blue text-white hover:bg-msep-blue/90"
                  disabled={isUpdatingStatus === selectedPlan.id}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submeter
                </Button>
              )}

              <Button
                size="sm"
                onClick={() => switchToConversation(selectedPlan.fullData.thread_id)}
                className="bg-msep-blue text-white hover:bg-msep-blue/90"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Editar com IA
              </Button>

              {/* <Button
                size="sm"
                onClick={() => window.open('https://geradordeapostila.senai.br/', '_blank')}
                className="bg-msep-blue text-white hover:bg-msep-blue/90"
              >
                <BookText className="h-4 w-4 mr-2" />
                Gerar Apostila
              </Button> */}
              <Button
                size="sm"
                onClick={() => handleExport(selectedPlan.id, selectedPlan.turma, selectedPlan.unidadeCurricular)}
                disabled={isExporting !== null}
                className="bg-msep-blue text-white hover:bg-msep-blue/90"
              >
                {isExporting === selectedPlan.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Exportar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setPreviewUrl(getPlanPreviewUrl(selectedPlan.id))
                  setPreviewTitle(selectedPlan.unidadeCurricular)
                  setPreviewOpen(true)
                }}
                className="bg-msep-blue text-white hover:bg-msep-blue/90"
              >
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </Button>
            </div>

            {/* Mobile Actions Dropdown */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-msep-blue text-white hover:bg-msep-blue/90 border-transparent">
                    Ações <MoreVertical className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {userRole === "coordenador" && selectedPlan.status !== "aprovado" && (
                    <>
                      <DropdownMenuItem onClick={() => handleStatusUpdate(selectedPlan.id, "aprovado")} className="text-green-600">
                        <CheckCircle className="h-4 w-4 mr-2" /> Aprovar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusUpdate(selectedPlan.id, "retornado")} className="text-amber-600">
                        <RotateCcw className="h-4 w-4 mr-2" /> Retornar
                      </DropdownMenuItem>
                    </>
                  )}
                  {userRole === "docente" && selectedPlan.status !== "aprovado" && selectedPlan.status !== "submetido" && (
                    <DropdownMenuItem onClick={() => handleStatusUpdate(selectedPlan.id, "submetido")}>
                      <Send className="h-4 w-4 mr-2" /> Submeter
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem onClick={() => switchToConversation(selectedPlan.fullData.thread_id)}>
                    <Sparkles className="h-4 w-4 mr-2" /> Editar com IA
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open('https://geradordeapostila.senai.br/', '_blank')}>
                    <BookText className="h-4 w-4 mr-2" /> Gerar Apostila
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport(selectedPlan.id, selectedPlan.turma, selectedPlan.unidadeCurricular)} disabled={isExporting !== null}>
                    {isExporting === selectedPlan.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />} Exportar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setPreviewUrl(getPlanPreviewUrl(selectedPlan.id))
                    setPreviewTitle(selectedPlan.unidadeCurricular)
                    setPreviewOpen(true)
                  }}>
                    <Eye className="h-4 w-4 mr-2" /> Visualizar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <ScrollArea className="flex-1 p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <GraduationCap className="h-5 w-5" />
                  Informações do Curso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {/* Linha 1: Curso, Turma, Modalidade */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="font-medium">Curso</p>
                    <p className="text-muted-foreground">{informacoesCurso.curso}</p>
                  </div>
                  <div>
                    <p className="font-medium">Turma</p>
                    <p className="text-muted-foreground">{informacoesCurso.turma}</p>
                  </div>
                  <div>
                    <p className="font-medium">Modalidade</p>
                    <p className="text-muted-foreground">{informacoesCurso.modalidade}</p>
                  </div>
                </div>

                {/* Linha 2: Unidade Curricular, Carga Horária */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium">Unidade Curricular</p>
                    <p className="text-muted-foreground">{informacoesCurso.unidade_curricular}</p>
                  </div>
                  <div>
                    <p className="font-medium">Carga Horária</p>
                    <p className="text-muted-foreground">{informacoesCurso.carga_horaria_total}</p>
                  </div>
                </div>

                {/* Linha 3: Professor, Departamento Regional, Escola */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="font-medium">Professor</p>
                    <p className="text-muted-foreground">{informacoesCurso.professor}</p>
                  </div>
                  <div>
                    <p className="font-medium">Departamento Regional</p>
                    <p className="text-muted-foreground">{informacoesCurso.departamento_regional}</p>
                  </div>
                  <div>
                    <p className="font-medium">Escola</p>
                    <p className="text-muted-foreground">{informacoesCurso.unidade}</p>
                  </div>
                </div>

                {/* Linha 4: Data de Início, Data de Fim */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium">Data de Início</p>
                    <p className="text-muted-foreground">{formatDate(selectedPlan.data_inicio) !== "N/A" ? formatDate(selectedPlan.data_inicio) : (informacoesCurso.data_inicio ? formatDate(informacoesCurso.data_inicio) : "N/A")}</p>
                  </div>
                  <div>
                    <p className="font-medium">Data de Fim</p>
                    <p className="text-muted-foreground">{formatDate(selectedPlan.data_fim) !== "N/A" ? formatDate(selectedPlan.data_fim) : (informacoesCurso.data_fim ? formatDate(informacoesCurso.data_fim) : "N/A")}</p>
                  </div>
                </div>

                {/* Linha 5: Objetivo */}
                <div>
                  <p className="font-medium">Objetivo</p>
                  <p className="text-muted-foreground">{informacoesCurso.objetivo}</p>
                </div>
              </CardContent>
            </Card>

            {/* Histórico de Status do Plano */}
            <StatusHistoryPanel
              planId={selectedPlan.id}
              refreshTrigger={historyRefreshTrigger}
            />

            {situacoesAprendizagem.map((situacao, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-primary">{situacao.titulo}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full" defaultValue="capacidades">
                    <AccordionItem value="capacidades">
                      <AccordionTrigger>Capacidades</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Capacidades Técnicas</h4>
                          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                            {(() => {
                              const tecnicas = situacao.capacidades.tecnicas || []
                              const basicas = situacao.capacidades.basicas || []
                              const capsToShow = tecnicas.length > 0 ? tecnicas : basicas
                              return capsToShow.map((cap, i) => (
                                <li key={i}>{cap}</li>
                              ))
                            })()}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Capacidades Socioemocionais</h4>
                          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                            {situacao.capacidades.socioemocionais.map((cap, i) => (
                              <li key={i}>{cap}</li>
                            ))}
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="conhecimentos">
                      <AccordionTrigger>Conhecimentos</AccordionTrigger>
                      <AccordionContent>{renderConhecimentos(situacao.conhecimentos)}</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="desafio">
                      <AccordionTrigger>Desafio</AccordionTrigger>
                      <AccordionContent className="space-y-4 prose max-w-none prose-sm">
                        <Badge>{situacao.estrategia_aprendizagem.tipo}</Badge>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {`### ${situacao.estrategia_aprendizagem.detalhes.titulo_sa}

**Contextualização:**
${situacao.estrategia_aprendizagem.detalhes.contextualizacao}

**Desafio:**
${situacao.estrategia_aprendizagem.detalhes.desafio}

**Resultados Esperados:**
${situacao.estrategia_aprendizagem.detalhes.resultados_esperados}`}
                        </ReactMarkdown>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="criterios">
                      <AccordionTrigger>Critérios de Avaliação</AccordionTrigger>
                      <AccordionContent className="space-y-6">
                        <div>
                          <h4 className="font-semibold mb-2">Critérios Dicotômicos</h4>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-1/3">Capacidade</TableHead>
                                  <TableHead>Critérios</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {situacao.criterios_avaliacao.dicotomicos.map((crit, i) => (
                                  <TableRow key={i}>
                                    <TableCell className="font-medium align-top">{crit.capacidade}</TableCell>
                                    <TableCell>
                                      <ul className="list-disc pl-5 space-y-1">
                                        {(Array.isArray(crit.criterios) ? crit.criterios : (typeof crit.criterios === 'string' ? [crit.criterios] : [])).map((c, j) => (
                                          <li key={j}>{c}</li>
                                        ))}
                                      </ul>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Critérios Graduais</h4>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Capacidade</TableHead>
                                  <TableHead>Critérios de Avaliação</TableHead>
                                  <TableHead>Nível 1</TableHead>
                                  <TableHead>Nível 2</TableHead>
                                  <TableHead>Nível 3</TableHead>
                                  <TableHead>Nível 4</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {situacao.criterios_avaliacao.graduais.map((crit, i) => (
                                  <TableRow key={i}>
                                    <TableCell className="font-medium align-top">{crit.capacidade}</TableCell>
                                    <TableCell className="align-top">
                                      <ul className="list-disc pl-4 space-y-1">
                                        {(Array.isArray(crit.criterios) ? crit.criterios : (typeof crit.criterios === 'string' ? [crit.criterios] : [])).map((c, idx) => (
                                          <li key={idx} className="text-xs">{c}</li>
                                        ))}
                                      </ul>
                                    </TableCell>
                                    <TableCell className="align-top">{crit.niveis.nivel_1}</TableCell>
                                    <TableCell className="align-top">{crit.niveis.nivel_2}</TableCell>
                                    <TableCell className="align-top">
                                      {(crit.niveis as any).nivel_3 || "N/A"}
                                    </TableCell>
                                    <TableCell className="align-top">
                                      {(crit.niveis as any).nivel_4 || "N/A"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="mt-6 text-sm text-muted-foreground p-4 bg-slate-50 rounded-md border">
                            <p className="font-semibold mb-2 text-primary">Legenda dos Níveis de Desempenho</p>
                            <ul className="space-y-2 text-xs">
                              <li>
                                <strong className="text-foreground">Nível 1: desempenho autônomo</strong> – apresenta
                                desempenho esperado da competência com autonomia, sem intervenções do docente
                              </li>
                              <li>
                                <strong className="text-foreground">Nível 2: desempenho parcialmente autônomo</strong> –
                                apresenta desempenho esperado da competência, com intervenções pontuais do docente
                              </li>
                              <li>
                                <strong className="text-foreground">Nível 3: desempenho apoiado</strong> – ainda não
                                apresenta desempenho esperado da competência, exigidas intervenções constantes do
                                docente
                              </li>
                              <li>
                                <strong className="text-foreground">Nível 4: desempenho não satisfatório</strong> – ainda
                                não apresenta desempenho esperado da competência, mesmo com intervenções constantes do
                                docente
                              </li>
                            </ul>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="plano-aula">
                      <AccordionTrigger>Plano de Aula</AccordionTrigger>
                      <AccordionContent>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data / Carga</TableHead>
                                <TableHead>Capacidades</TableHead>
                                <TableHead>Conhecimentos</TableHead>
                                <TableHead>Estratégias</TableHead>
                                <TableHead>Recursos</TableHead>
                                <TableHead>Critérios de Avaliação</TableHead>
                                <TableHead>Instrumento</TableHead>
                                <TableHead>Referências</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {situacao.plano_de_aula.map((aula, i) => (
                                <TableRow key={i}>
                                  <TableCell className="align-top">{aula.horas_aulas_data}</TableCell>
                                  <TableCell className="whitespace-pre-wrap align-top">{aula.capacidades}</TableCell>
                                  <TableCell className="whitespace-pre-wrap align-top">{aula.conhecimentos}</TableCell>
                                  <TableCell className="whitespace-pre-wrap align-top">{aula.estrategias}</TableCell>
                                  <TableCell className="whitespace-pre-wrap align-top">
                                    {(aula as any).recursos_ambientes || "N/A"}
                                  </TableCell>
                                  <TableCell className="whitespace-pre-wrap align-top">
                                    {(aula as any).criterios_avaliacao || "N/A"}
                                  </TableCell>
                                  <TableCell className="whitespace-pre-wrap align-top">
                                    {(aula as any).instrumento_avaliacao || "N/A"}
                                  </TableCell>
                                  <TableCell className="whitespace-pre-wrap align-top">
                                    {(aula as any).referencias || "N/A"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="perguntas-mediadoras">
                      <AccordionTrigger>Perguntas Mediadoras</AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                          {situacao.perguntas_mediadoras.map((pergunta, i) => (
                            <li key={i}>{pergunta}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {/* Modal para gerar recurso didático */}
        {resourceModalPlan && resourceModalPlan.fullData && (
          <GenerateResourceModal
            open={!!resourceModalPlan}
            onOpenChange={(open) => !open && setResourceModalPlan(null)}
            planId={resourceModalPlan.id}
            planTitle={resourceModalPlan.unidadeCurricular}
            userId={session?.user?.id || ""}
            situacoesAprendizagem={
              resourceModalPlan.fullData.plan_content?.plano_de_ensino?.situacoes_aprendizagem || []
            }
          />
        )}

        {/* Modal de Preview de Plano (para view de detalhes) */}
        <DocxPreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title={previewTitle}
          previewUrl={previewUrl}
        />

        {/* Modal de Comentário para Mudança de Status (para view de detalhes) */}
        {pendingStatusChange && (
          <StatusCommentDialog
            isOpen={commentDialogOpen}
            onClose={() => {
              setCommentDialogOpen(false)
              setPendingStatusChange(null)
            }}
            onConfirm={confirmStatusUpdate}
            newStatus={pendingStatusChange.newStatus}
            isLoading={isUpdatingStatus === pendingStatusChange.planId}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-msep-blue/5">
        <h2 className="text-lg font-medium text-primary">Planos de Ensino Salvos</h2>
        <p className="text-sm text-muted-foreground">
          {plans.length > 0
            ? `Visualize e gerencie seus planos salvos.`
            : "Nenhum plano de ensino salvo encontrado."}
        </p>
      </div>

      <div className="p-4 md:px-6 border-b grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="relative">
          <Combobox
            options={departmentOptions.map(opt => ({ value: opt, label: opt }))}
            value={selectedDepartment}
            onChange={setSelectedDepartment}
            placeholder="Todos Departamentos"
            searchPlaceholder="Buscar departamento..."
            emptyMessage="Nenhum departamento encontrado."
            label="Departamento Regional"
          />
          {selectedDepartment !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-0 right-0 h-full px-3"
              onClick={() => setSelectedDepartment('all')}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
        <div className="relative">
          <Combobox
            options={schoolOptions.map(opt => ({ value: opt, label: opt }))}
            value={selectedSchool}
            onChange={setSelectedSchool}
            placeholder="Todas Escolas"
            searchPlaceholder="Buscar escola..."
            emptyMessage="Nenhuma escola encontrada."
            label="Escola"
          />
          {selectedSchool !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-0 right-0 h-full px-3"
              onClick={() => setSelectedSchool('all')}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
        <div className="relative">
          <Combobox
            options={teacherOptions.map(opt => ({ value: opt, label: opt }))}
            value={selectedTeacher}
            onChange={setSelectedTeacher}
            placeholder="Todos Docentes"
            searchPlaceholder="Buscar docente..."
            emptyMessage="Nenhum docente encontrado."
            label="Docente"
          />
          {selectedTeacher !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-0 right-0 h-full px-3"
              onClick={() => setSelectedTeacher('all')}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
        <div className="relative">
          <Combobox
            options={courseOptions.map(opt => ({ value: opt, label: opt }))}
            value={selectedCourse}
            onChange={setSelectedCourse}
            placeholder="Todos Cursos"
            searchPlaceholder="Buscar curso..."
            emptyMessage="Nenhum curso encontrado."
            label="Curso"
          />
          {selectedCourse !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-0 right-0 h-full px-3"
              onClick={() => setSelectedCourse('all')}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="active" className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-4 md:px-6 border-b">
          <div className="w-full overflow-x-auto pb-2">
            <TabsList className="w-full justify-start h-auto flex-wrap sm:flex-nowrap">
              <TabsTrigger value="active" className="flex-shrink-0">Ativos ({activePlans.length})</TabsTrigger>

              {userRole === "coordenador" && (
                <TabsTrigger value="pending" className="flex items-center gap-2 flex-shrink-0">
                  Aguardando Aprovação
                  {pendingPlans.length > 0 && (
                    <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                      {pendingPlans.length}
                    </Badge>
                  )}
                </TabsTrigger>
              )}

              <TabsTrigger value="archived" className="flex-shrink-0">Arquivados ({archivedPlans.length})</TabsTrigger>
              <TabsTrigger value="public" className="flex-shrink-0">Públicos ({publicPlans.length})</TabsTrigger>
            </TabsList>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6">
            <TabsContent value="active">
              {renderPlanList(activePlans, "Nenhum plano ativo encontrado para os filtros selecionados.")}
            </TabsContent>
            <TabsContent value="pending" className="mt-6">
              {loadingPendingPlans ? (
                <div className="flex flex-col h-40 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="mt-4 text-muted-foreground">Buscando planos pendentes...</p>
                </div>
              ) : (
                renderPlanList(pendingPlans, "Não há planos aguardando aprovação no momento.")
              )}
            </TabsContent>

            <TabsContent value="archived" className="mt-6">
              {renderPlanList(archivedPlans, "Nenhum plano arquivado encontrado para os filtros selecionados.")}
            </TabsContent>
            <TabsContent value="public">
              {loadingPublicPlans ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-4 text-muted-foreground">Carregando planos públicos...</p>
                </div>
              ) : publicPlans.length === 0 ? (
                <div className="text-center py-16">
                  <Globe className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground mb-2">Nenhum plano público disponível</p>
                  <p className="text-sm text-muted-foreground">
                    Planos aprovados e marcados como públicos por outros docentes aparecerão aqui.
                  </p>
                </div>
              ) : (
                renderCards(publicPlans)
              )}
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>

      {/* Modal para gerar recurso didático */}
      {resourceModalPlan && resourceModalPlan.fullData && (
        <GenerateResourceModal
          open={!!resourceModalPlan}
          onOpenChange={(open) => !open && setResourceModalPlan(null)}
          planId={resourceModalPlan.id}
          planTitle={resourceModalPlan.unidadeCurricular}
          userId={session?.user?.id || ""}
          situacoesAprendizagem={
            resourceModalPlan.fullData.plan_content?.plano_de_ensino?.situacoes_aprendizagem || []
          }
        />
      )}

      {/* Modal de Preview de Plano */}
      <DocxPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={previewTitle}
        previewUrl={previewUrl}
      />

      {/* Modal de Comentário para Mudança de Status */}
      {pendingStatusChange && (
        <StatusCommentDialog
          isOpen={commentDialogOpen}
          onClose={() => {
            setCommentDialogOpen(false)
            setPendingStatusChange(null)
          }}
          onConfirm={confirmStatusUpdate}
          newStatus={pendingStatusChange.newStatus}
          isLoading={isUpdatingStatus === pendingStatusChange.planId}
        />
      )}
    </div>
  )
}