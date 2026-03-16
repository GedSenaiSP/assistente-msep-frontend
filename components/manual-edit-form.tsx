"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, Save, Plus, Trash, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import {
    getSinglePlan,
    getProcessedDocument,
    saveManualPlan,
    type SinglePlanResponse,
    type UCEntry
} from "@/services/api"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { MultiSelect, Option } from "@/components/ui/multi-select"
import { Combobox } from "@/components/ui/combobox"
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

// Tipos locais
interface CriterioAvaliacaoForm {
    tipo: "dicotomico" | "gradual"
    criterio: string
    capacidade: string
    nivel1?: string
    nivel2?: string
    nivel3?: string
    nivel4?: string
    criterios?: string[]
}

interface AulaForm {
    data: string
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

interface ConhecimentoForm {
    topico: string
    subtopicos: ConhecimentoForm[]
}

interface SituacaoAprendizagemForm {
    tema: string
    desafio: string
    estrategia: string
    resultados_esperados: string
    perguntas_mediadoras: string[]
    capacidades_tecnicas: string[]
    capacidades_socioemocionais: string[]
    conhecimentos: ConhecimentoForm[]
    criterios: CriterioAvaliacaoForm[]
    plano_aula: AulaForm[]
}

const STRATEGIES_OPTIONS = [
    { value: "Situação Problema", label: "Situação Problema" },
    { value: "Estudo de Caso", label: "Estudo de Caso" },
    { value: "Pesquisa Aplicada", label: "Pesquisa Aplicada" },
    { value: "Projeto", label: "Projeto" },
    { value: "Projeto Integrador", label: "Projeto Integrador" },
]

// Helper para extrair o prefixo de numeração (ex: "1.2." de "1.2. Conceitos")
const getNumberingPrefix = (text: string): string | null => {
    const match = text.match(/^(\d+(\.\d+)*)\.?\s/)
    return match ? match[1] : null
}

// Componente de input inteligente com filtro hierárquico
const SmartTaxonomyInput = ({
    value,
    onChange,
    placeholder,
    className,
    parentContext,
    allSuggestions,
    usedValues = []
}: {
    value: string
    onChange: (val: string) => void
    placeholder?: string
    className?: string
    parentContext: string | null // Texto do tópico pai (ex: "1. Arquitetura")
    allSuggestions: string[]
    usedValues?: string[]
}) => {
    const [open, setOpen] = useState(false)

    // Lógica eficiente de filtragem
    const filteredSuggestions = allSuggestions.filter(item => {
        // 1. Remove itens já usados (exceto o valor atual)
        if (usedValues.includes(item) && item !== value) return false

        const itemPrefix = getNumberingPrefix(item)
        if (!itemPrefix) return false // Ignora itens sem numeração padrão

        if (!parentContext) {
            // Nível Raiz: Sugerir apenas itens "1.", "2.", etc. (sem pontos internos)
            // Ex: "1. Rede", "2. Protocolos" -> True
            // Ex: "1.1. Definição" -> False (tem ponto no meio "1.1")
            return !itemPrefix.includes(".")
        }

        const parentPrefix = getNumberingPrefix(parentContext)
        if (!parentPrefix) return false

        // Nível Filho: O item deve começar com o prefixo do pai + "."
        // Ex: Pai "1", Filho deve começar com "1." (como "1.1", "1.2")
        // Mas não pode ser neto (ex: "1.1.1" não deve aparecer para "1")
        if (!itemPrefix.startsWith(parentPrefix + ".")) return false

        // Verifica profundidade: Remove o prefixo do pai e vê se resta apenas um número
        const suffix = itemPrefix.substring(parentPrefix.length + 1) // +1 pelo ponto
        return !suffix.includes(".")
    })

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverAnchor asChild>
                <div className="relative w-full">
                    <Input
                        value={value}
                        onChange={(e) => {
                            onChange(e.target.value)
                            setOpen(true)
                        }}
                        onFocus={() => setOpen(true)}
                        onClick={() => setOpen(true)}
                        placeholder={placeholder}
                        className={cn("w-full cursor-text", className)}
                        autoComplete="off"
                    />
                </div>
            </PopoverAnchor>
            {filteredSuggestions.length > 0 && (
                <PopoverContent
                    className="p-0 w-[400px] max-h-[300px] overflow-auto"
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()} // Impede que o foco saia do input
                >
                    <Command>
                        <CommandList>
                            <CommandGroup heading="Conhecimentos">
                                {filteredSuggestions.map((suggestion) => (
                                    <CommandItem
                                        key={suggestion}
                                        onSelect={() => {
                                            onChange(suggestion)
                                            setOpen(false)
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === suggestion ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {suggestion}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            )}
        </Popover>
    )
}

// Componente recursivo para edição de conhecimentos
const KnowledgeItem = ({
    item,
    onChange,
    onRemove,
    level = 0,
    parentContext = null,
    allSuggestions = [],
    siblingsDefined = []
}: {
    item: ConhecimentoForm,
    onChange: (newItem: ConhecimentoForm) => void,
    onRemove: () => void,
    level?: number,
    parentContext?: string | null,
    allSuggestions?: string[],
    siblingsDefined?: string[] // Lista de tópicos irmãos já definidos (para filtrar)
}) => {
    const addSubtopic = () => {
        onChange({
            ...item,
            subtopicos: [...item.subtopicos, { topico: "", subtopicos: [] }]
        })
    }

    const updateSubtopic = (index: number, newSub: ConhecimentoForm) => {
        const newSubs = [...item.subtopicos]
        newSubs[index] = newSub
        onChange({ ...item, subtopicos: newSubs })
    }

    const removeSubtopic = (index: number) => {
        // if (confirm("Remover este tópico?")) { // Removido confirm para agilizar UX
        const newSubs = [...item.subtopicos]
        newSubs.splice(index, 1)
        onChange({ ...item, subtopicos: newSubs })
        // }
    }

    // Calcular subtópicos já usados para passar para os filhos
    const currentSubtopicsUsed = item.subtopicos.map(s => s.topico).filter(t => t)

    return (
        <div className={`space-y-2 ${level > 0 ? "ml-4 border-l pl-4 border-msep-blue/20" : ""}`}>
            <div className="flex items-center gap-2">
                <div className="flex-1">
                    <SmartTaxonomyInput
                        value={item.topico || ""}
                        onChange={(val) => onChange({ ...item, topico: val })}
                        placeholder={level === 0 ? "Tópico Principal (ex: 1. Introdução)" : "Subtópico (ex: 1.1. Definição)"}
                        parentContext={parentContext}
                        allSuggestions={allSuggestions}
                        usedValues={siblingsDefined}
                    />
                </div>
                <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive h-8 w-8 hover:bg-destructive/10">
                    <Trash className="h-4 w-4" />
                </Button>
            </div>

            {item.subtopicos.length > 0 && (
                <div className="space-y-2 mt-2">
                    {item.subtopicos.map((sub, idx) => (
                        <KnowledgeItem
                            key={idx}
                            item={sub}
                            onChange={(newSub) => updateSubtopic(idx, newSub)}
                            onRemove={() => removeSubtopic(idx)}
                            level={level + 1}
                            parentContext={item.topico} // O tópico atual é o pai do próximo nível
                            allSuggestions={allSuggestions}
                            siblingsDefined={currentSubtopicsUsed} // Passa os irmãos do nível abaixo
                        />
                    ))}
                </div>
            )}

            <Button variant="ghost" size="sm" onClick={addSubtopic} className="text-xs text-muted-foreground hover:text-msep-blue h-6 px-2">
                <Plus className="h-3 w-3 mr-1" />
                Adicionar {item.subtopicos.length > 0 ? "outro " : ""}subtópico
            </Button>
        </div>
    )
}

interface GeneralInfoForm {
    curso: string
    turma: string
    unidade_curricular: string
    modalidade: string
    professor: string
    escola: string
    departamento_regional: string
    carga_horaria_total: string
    objetivo: string
}

interface ManualEditFormProps {
    planId: string
    userId: string
    onCancel: () => void
    onSaveSuccess: (newPlanId?: string) => void
}

export function ManualEditForm({ planId, userId, onCancel, onSaveSuccess }: ManualEditFormProps) {

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [originalPlan, setOriginalPlan] = useState<SinglePlanResponse | null>(null)
    const [courseData, setCourseData] = useState<UCEntry | null>(null)

    // Estado do formulário
    const [generalInfo, setGeneralInfo] = useState<GeneralInfoForm>({
        curso: "",
        turma: "",
        unidade_curricular: "",
        modalidade: "",
        professor: "",
        escola: "",
        departamento_regional: "",
        carga_horaria_total: "",
        objetivo: ""
    })

    const [dates, setDates] = useState({
        data_inicio: "",
        data_fim: ""
    })

    const [situacoes, setSituacoes] = useState<SituacaoAprendizagemForm[]>([])

    // Opções carregadas do plano de curso
    const [availableCapTecnicas, setAvailableCapTecnicas] = useState<string[]>([])
    const [availableCapSocio, setAvailableCapSocio] = useState<string[]>([])
    const [availableConhecimentos, setAvailableConhecimentos] = useState<string[]>([])

    useEffect(() => {
        async function loadData() {
            if (!userId || !planId) return

            try {
                setIsLoading(true)
                // 1. Carregar o plano salvo
                const planResponse = await getSinglePlan(planId)
                setOriginalPlan(planResponse)

                const planContent = planResponse.plan_content.plano_de_ensino

                // Popular Info Geral
                setGeneralInfo({
                    curso: planContent.informacoes_curso.curso || "",
                    turma: planContent.informacoes_curso.turma || "",
                    unidade_curricular: planContent.informacoes_curso.unidade_curricular || "",
                    modalidade: planContent.informacoes_curso.modalidade || "",
                    professor: planContent.informacoes_curso.professor || "",
                    escola: planContent.informacoes_curso.unidade || "",
                    departamento_regional: planContent.informacoes_curso.departamento_regional || "",
                    carga_horaria_total: planContent.informacoes_curso.carga_horaria_total || "",
                    objetivo: planContent.informacoes_curso.objetivo || ""
                })

                setDates({
                    data_inicio: planContent.informacoes_curso.data_inicio || (planResponse as any).data_inicio || "",
                    data_fim: planContent.informacoes_curso.data_fim || (planResponse as any).data_fim || ""
                })


                // 2. Carregar o documento de curso original se disponível
                // Prioriza course_plan_id, depois stored_markdown_id (legado), depois thread_id
                const storedMarkdownId = (planResponse as any).course_plan_id || (planResponse as any).stored_markdown_id || planResponse.thread_id

                if (storedMarkdownId) {
                    try {
                        const docResponse = await getProcessedDocument(storedMarkdownId)
                        if (docResponse && docResponse.unidadesCurriculares) {
                            // Helper para normalizar strings (remover acentos, lowercase)
                            const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()

                            const ucNomeNoPlano = normalize(planContent.informacoes_curso.unidade_curricular)

                            console.log("Tentando encontrar UC:", ucNomeNoPlano)
                            console.log("UCs disponíveis:", docResponse.unidadesCurriculares.map((u: any) => normalize(u.nomeUC)))

                            // Encontrar a UC correspondente (tentativa mais robusta)
                            const targetUC = docResponse.unidadesCurriculares.find(
                                (uc: any) => {
                                    const ucNomeDoc = normalize(uc.nomeUC)
                                    return ucNomeDoc.includes(ucNomeNoPlano) || ucNomeNoPlano.includes(ucNomeDoc)
                                }
                            )

                            if (targetUC) {
                                console.log("UC Encontrada:", targetUC.nomeUC)
                                setCourseData(targetUC)
                                setAvailableCapTecnicas(targetUC.capacidades.CapacidadesTecnicas_list || [])
                                setAvailableCapSocio(targetUC.capacidades.CapacidadesSocioemocionais_list || [])
                                setAvailableConhecimentos(targetUC.conhecimentos || [])
                            } else {
                                console.warn("Dados do curso carregados, mas UC não encontrada.")
                            }
                        }
                    } catch (err) {
                        console.error("Erro ao carregar documento original:", err)
                    }
                }

                // 3. Transformar Situações de Aprendizagem
                const mapConhecimentos = (items: any[]): ConhecimentoForm[] => {
                    if (!Array.isArray(items)) return []
                    return items.map(item => {
                        if (typeof item === 'string') {
                            return { topico: item, subtopicos: [] }
                        }
                        return {
                            topico: item.topico || item.descricao || "Sem título",
                            subtopicos: mapConhecimentos(item.subtopicos || [])
                        }
                    })
                }

                const mappedSituacoes: SituacaoAprendizagemForm[] = planContent.situacoes_aprendizagem.map((sa: any) => {
                    const mappedConhecimentos = mapConhecimentos(sa.conhecimentos)

                    const mappedCriterios: CriterioAvaliacaoForm[] = []
                    if (sa.criterios_avaliacao) {
                        if (sa.criterios_avaliacao.dicotomicos) {
                            sa.criterios_avaliacao.dicotomicos.forEach((c: any) => {
                                c.criterios.forEach((crit: string) => {
                                    mappedCriterios.push({
                                        tipo: "dicotomico",
                                        criterio: crit,
                                        capacidade: c.capacidade
                                    })
                                })
                            })
                        }
                        if (sa.criterios_avaliacao.graduais) {
                            sa.criterios_avaliacao.graduais.forEach((c: any) => {
                                mappedCriterios.push({
                                    tipo: "gradual",
                                    criterio: c.criterio || (Array.isArray(c.criterios) ? c.criterios[0] : ""),
                                    capacidade: c.capacidade,
                                    nivel1: c.niveis?.nivel_1,
                                    nivel2: c.niveis?.nivel_2,
                                    nivel3: c.niveis?.nivel_3,
                                    nivel4: c.niveis?.nivel_4
                                })
                            })
                        }
                    }

                    const mappedAulas: AulaForm[] = Array.isArray(sa.plano_de_aula) ? sa.plano_de_aula.map((aula: any) => {
                        return {
                            data: aula.horas_aulas_data || "",
                            hora_inicio: "",
                            hora_fim: "",
                            capacidades: aula.capacidades ? aula.capacidades.split("\n") : [],
                            conhecimentos: aula.conhecimentos ? aula.conhecimentos.split("\n") : [],
                            estrategias: aula.estrategias || "",
                            recursos: aula.recursos_ambientes || "",
                            criterios_avaliacao: aula.criterios_avaliacao ? aula.criterios_avaliacao.split("\n") : [],
                            instrumento: aula.instrumento_avaliacao || "",
                            referencias: aula.referencias || ""
                        }
                    }) : []

                    return {
                        tema: sa.titulo || sa.tema_gerador || "",
                        desafio: sa.estrategia_aprendizagem?.detalhes?.desafio || sa.desafio || "",
                        estrategia: sa.estrategia_aprendizagem?.tipo || "",
                        resultados_esperados: sa.estrategia_aprendizagem?.detalhes?.resultados_esperados || "",
                        perguntas_mediadoras: sa.perguntas_mediadoras || [],
                        capacidades_tecnicas: (sa.capacidades?.tecnicas?.length ? sa.capacidades.tecnicas : sa.capacidades?.basicas) || [],
                        capacidades_socioemocionais: sa.capacidades?.socioemocionais || [],
                        conhecimentos: mappedConhecimentos,
                        criterios: mappedCriterios,
                        plano_aula: mappedAulas
                    }
                })

                setSituacoes(mappedSituacoes)

            } catch (error) {
                console.error("Erro ao carregar dados:", error)
                toast({
                    title: "Erro ao carregar plano",
                    description: "Não foi possível carregar os dados para edição.",
                    variant: "destructive"
                })
                onCancel()
            } finally {
                setIsLoading(false)
            }
        }

        loadData()
    }, [userId, planId])

    const handleSave = async () => {
        if (!userId) return

        setIsSaving(true)
        try {
            // Reconstruir o objeto conforme o esquema esperado pelo backend (Nested)
            const situacoesMapped = situacoes.map(s => {
                // Mapear critérios
                const dicotomicos = s.criterios
                    .filter(c => c.tipo === "dicotomico")
                    .map(c => ({
                        capacidade: c.capacidade || "",
                        criterios: [c.criterio]
                    }))

                const graduais = s.criterios
                    .filter(c => c.tipo === "gradual")
                    .map(c => ({
                        capacidade: c.capacidade || "",
                        criterio: c.criterio,
                        niveis: {
                            nivel_1: c.nivel1 || "",
                            nivel_2: c.nivel2 || "",
                            nivel_3: c.nivel3 || "",
                            nivel_4: c.nivel4 || ""
                        }
                    }))

                // Mapear plano de aula
                const planoAulaMapped = s.plano_aula.map(a => ({
                    horas_aulas_data: a.data,
                    capacidades: a.capacidades.join("\n"),
                    conhecimentos: a.conhecimentos.join("\n"),
                    estrategias: a.estrategias,
                    recursos_ambientes: a.recursos,
                    criterios_avaliacao: a.criterios_avaliacao.join("\n"),
                    instrumento_avaliacao: a.instrumento,
                    referencias: a.referencias
                }))

                // Função auxiliar para converter string de conhecimentos de volta para objeto se necessário
                // Ou usar a estrutura que já está no estado se for compatível
                const mapConhecimentosRecursive = (items: ConhecimentoForm[]): any[] => {
                    return items.map(item => ({
                        topico: item.topico,
                        subtopicos: mapConhecimentosRecursive(item.subtopicos)
                    }))
                }

                return {
                    titulo: s.tema,
                    capacidades: {
                        basicas: [], // Não temos campo explícito para básicas no form manual por enquanto, assumindo vazio ou mix em técnicas
                        tecnicas: s.capacidades_tecnicas,
                        socioemocionais: s.capacidades_socioemocionais
                    },
                    conhecimentos: mapConhecimentosRecursive(s.conhecimentos),
                    estrategia_aprendizagem: {
                        tipo: s.estrategia,
                        aulas_previstas: `${s.plano_aula.length} aulas`,
                        carga_horaria: "20 horas", // Valor default ou adicionar campo no form
                        detalhes: {
                            titulo_sa: s.tema,
                            contextualizacao: s.desafio, // Usando desafio como contextualização também por enquanto
                            desafio: s.desafio,
                            resultados_esperados: s.resultados_esperados
                        }
                    },
                    criterios_avaliacao: {
                        dicotomicos: dicotomicos,
                        graduais: graduais
                    },
                    plano_de_aula: planoAulaMapped,
                    perguntas_mediadoras: s.perguntas_mediadoras
                }
            })

            // Construir payload
            const payload = {
                user_id: userId,
                plan_id: planId, // Passar o ID original para manter referência
                thread_id: originalPlan?.thread_id, // Passar o thread_id original
                course_plan_id: (originalPlan as any)?.course_plan_id, // Preservar o course_plan_id original
                plan_content: {
                    plano_de_ensino: {
                        informacoes_curso: {
                            curso: generalInfo.curso,
                            turma: generalInfo.turma,
                            unidade_curricular: generalInfo.unidade_curricular,
                            modulo: "MÓDULO BÁSICO", // Default
                            carga_horaria_total: generalInfo.carga_horaria_total,
                            objetivo: generalInfo.objetivo,
                            modalidade: generalInfo.modalidade,
                            professor: generalInfo.professor,
                            unidade: generalInfo.escola,
                            departamento_regional: generalInfo.departamento_regional,
                            data_inicio: dates.data_inicio,
                            data_fim: dates.data_fim
                        },
                        situacoes_aprendizagem: situacoesMapped
                    }
                }
            }

            const response = await saveManualPlan(payload)

            toast({
                title: "Plano salvo com sucesso!",
                description: "Uma nova versão do plano foi criada."
            })

            onSaveSuccess(response.plan_id)

        } catch (error) {
            console.error("Erro ao salvar:", error)
            toast({
                title: "Erro ao salvar",
                description: "Ocorreu um erro ao salvar as alterações.",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    const updateSituacao = (index: number, field: keyof SituacaoAprendizagemForm, value: any) => {
        const newSituacoes = [...situacoes]
        newSituacoes[index] = { ...newSituacoes[index], [field]: value }
        setSituacoes(newSituacoes)
    }

    const addSituacao = () => {
        setSituacoes([...situacoes, {
            tema: "Nova Situação de Aprendizagem",
            desafio: "",
            estrategia: "Situação-Problema",
            resultados_esperados: "",
            perguntas_mediadoras: [],
            capacidades_tecnicas: [],
            capacidades_socioemocionais: [],
            conhecimentos: [],
            criterios: [],
            plano_aula: []
        }])
    }

    const removeSituacao = (index: number) => {
        if (confirm("Tem certeza que deseja remover esta situação de aprendizagem?")) {
            const newSituacoes = [...situacoes]
            newSituacoes.splice(index, 1)
            setSituacoes(newSituacoes)
        }
    }

    // Helpers para Critérios
    const addCriterio = (saIndex: number) => {
        const newSituacoes = [...situacoes]
        newSituacoes[saIndex].criterios.push({
            tipo: "dicotomico",
            criterio: "",
            capacidade: ""
        })
        setSituacoes(newSituacoes)
    }

    const removeCriterio = (saIndex: number, criIndex: number) => {
        const newSituacoes = [...situacoes]
        newSituacoes[saIndex].criterios.splice(criIndex, 1)
        setSituacoes(newSituacoes)
    }

    const updateCriterio = (saIndex: number, criIndex: number, field: keyof CriterioAvaliacaoForm, value: any) => {
        const newSituacoes = [...situacoes]
        newSituacoes[saIndex].criterios[criIndex] = { ...newSituacoes[saIndex].criterios[criIndex], [field]: value }
        setSituacoes(newSituacoes)
    }

    // Helpers para Plano de Aula
    const addAula = (saIndex: number) => {
        const newSituacoes = [...situacoes]
        newSituacoes[saIndex].plano_aula.push({
            data: "",
            hora_inicio: "",
            hora_fim: "",
            capacidades: [],
            conhecimentos: [],
            estrategias: "",
            recursos: "",
            criterios_avaliacao: [],
            instrumento: "",
            referencias: ""
        })
        setSituacoes(newSituacoes)
    }

    const removeAula = (saIndex: number, aulaIndex: number) => {
        const newSituacoes = [...situacoes]
        newSituacoes[saIndex].plano_aula.splice(aulaIndex, 1)
        setSituacoes(newSituacoes)
    }

    const updateAula = (saIndex: number, aulaIndex: number, field: keyof AulaForm, value: any) => {
        const newSituacoes = [...situacoes]
        newSituacoes[saIndex].plano_aula[aulaIndex] = { ...newSituacoes[saIndex].plano_aula[aulaIndex], [field]: value }
        setSituacoes(newSituacoes)
    }

    // Helpers para Conhecimentos
    const addConhecimento = (saIndex: number) => {
        const newSituacoes = [...situacoes]
        newSituacoes[saIndex].conhecimentos.push({ topico: "", subtopicos: [] })
        setSituacoes(newSituacoes)
    }

    const updateConhecimento = (saIndex: number, conIndex: number, newItem: ConhecimentoForm) => {
        const newSituacoes = [...situacoes]
        newSituacoes[saIndex].conhecimentos[conIndex] = newItem
        setSituacoes(newSituacoes)
    }

    const removeConhecimento = (saIndex: number, conIndex: number) => {
        if (confirm("Remover este tópico de conhecimento?")) {
            const newSituacoes = [...situacoes]
            newSituacoes[saIndex].conhecimentos.splice(conIndex, 1)
            setSituacoes(newSituacoes)
        }
    }

    // Helpers para Perguntas Mediadoras
    const addPergunta = (saIndex: number) => {
        const newSituacoes = [...situacoes]
        newSituacoes[saIndex].perguntas_mediadoras.push("")
        setSituacoes(newSituacoes)
    }

    const updatePergunta = (saIndex: number, pIndex: number, value: string) => {
        const newSituacoes = [...situacoes]
        newSituacoes[saIndex].perguntas_mediadoras[pIndex] = value
        setSituacoes(newSituacoes)
    }

    const removePergunta = (saIndex: number, pIndex: number) => {
        const newSituacoes = [...situacoes]
        newSituacoes[saIndex].perguntas_mediadoras.splice(pIndex, 1)
        setSituacoes(newSituacoes)
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Carregando dados do plano...</span>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <Button size="sm" onClick={onCancel} className="bg-msep-blue text-white hover:bg-msep-blue/90">
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>
                    <h2 className="text-lg font-medium text-primary truncate flex-1 sm:flex-none">Editar Plano Manualmente</h2>
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <Button onClick={handleSave} disabled={isSaving} className="bg-msep-blue text-white hover:bg-msep-blue/90 w-full sm:w-auto">
                        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Salvar Nova Versão
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 p-4 md:p-6">
                <div className="max-w-7xl mx-auto space-y-6">

                    <Tabs defaultValue="geral" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="geral">Informações Gerais</TabsTrigger>
                            <TabsTrigger value="situacoes">Situações de Aprendizagem</TabsTrigger>
                        </TabsList>

                        <TabsContent value="geral" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Informações Gerais</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Linha 1: Curso, Turma, Modalidade */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                        <div className="md:col-span-4 space-y-2">
                                            <Label htmlFor="curso">Curso</Label>
                                            <Input
                                                id="curso"
                                                value={generalInfo.curso}
                                                disabled
                                                className="bg-muted"
                                            />
                                        </div>
                                        <div className="md:col-span-4 space-y-2">
                                            <Label htmlFor="turma">Turma</Label>
                                            <Input
                                                id="turma"
                                                value={generalInfo.turma}
                                                onChange={(e) => setGeneralInfo({ ...generalInfo, turma: e.target.value })}
                                            />
                                        </div>
                                        <div className="md:col-span-4 space-y-2">
                                            <Label htmlFor="modalidade">Modalidade</Label>
                                            <Select
                                                value={generalInfo.modalidade}
                                                onValueChange={(value) => setGeneralInfo({ ...generalInfo, modalidade: value })}
                                            >
                                                <SelectTrigger id="modalidade">
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Presencial">Presencial</SelectItem>
                                                    <SelectItem value="Híbrida">Híbrida</SelectItem>
                                                    <SelectItem value="Online">Online</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Linha 2: Unidade Curricular, Carga Horária */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                        <div className="md:col-span-8 space-y-2">
                                            <Label htmlFor="uc">Unidade Curricular</Label>
                                            <Input
                                                id="uc"
                                                value={generalInfo.unidade_curricular}
                                                disabled
                                                className="bg-muted"
                                            />
                                        </div>
                                        <div className="md:col-span-4 space-y-2">
                                            <Label htmlFor="carga">Carga Horária Total</Label>
                                            <Input
                                                id="carga"
                                                value={generalInfo.carga_horaria_total}
                                                disabled
                                                className="bg-muted"
                                            />
                                        </div>
                                    </div>

                                    {/* Linha 3: Professor, Departamento Regional, Escola */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                        <div className="md:col-span-4 space-y-2">
                                            <Label htmlFor="docente">Docente</Label>
                                            <Input
                                                id="docente"
                                                value={generalInfo.professor}
                                                disabled
                                                className="bg-muted"
                                            />
                                        </div>
                                        <div className="md:col-span-4 space-y-2">
                                            <Label htmlFor="departamento">Departamento Regional</Label>
                                            <Input
                                                id="departamento"
                                                value={generalInfo.departamento_regional}
                                                disabled
                                                className="bg-muted"
                                            />
                                        </div>
                                        <div className="md:col-span-4 space-y-2">
                                            <Label htmlFor="escola">Escola</Label>
                                            <Input
                                                id="escola"
                                                value={generalInfo.escola}
                                                disabled
                                                className="bg-muted"
                                            />
                                        </div>
                                    </div>

                                    {/* Linha 4: Data de Início, Data de Fim */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="inicio">Data Início</Label>
                                            <Input
                                                id="inicio"
                                                type="date"
                                                value={dates.data_inicio}
                                                onChange={(e) => setDates({ ...dates, data_inicio: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="fim">Data Fim</Label>
                                            <Input
                                                id="fim"
                                                type="date"
                                                value={dates.data_fim}
                                                onChange={(e) => setDates({ ...dates, data_fim: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Linha 5: Objetivo */}
                                    <div className="space-y-2">
                                        <Label htmlFor="objetivo">Objetivo</Label>
                                        <Textarea
                                            id="objetivo"
                                            value={generalInfo.objetivo}
                                            disabled
                                            className="bg-muted min-h-[100px]"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="situacoes" className="mt-4">
                            <div className="space-y-6">
                                {situacoes.map((sa, index) => (
                                    <Card key={index} className="border-l-4 border-l-msep-blue">
                                        <CardHeader className="flex flex-row items-center justify-between">
                                            <CardTitle className="text-lg">
                                                Situação de Apredizagem {index + 1}
                                            </CardTitle>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeSituacao(index)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <Accordion type="single" collapsible className="w-full" defaultValue="capacidades">
                                                <AccordionItem value="capacidades">
                                                    <AccordionTrigger>Capacidades e Conhecimentos</AccordionTrigger>
                                                    <AccordionContent>
                                                        <div className="grid gap-6 md:grid-cols-2">
                                                            {/* Capacidades Técnicas */}
                                                            <div className="space-y-3">
                                                                <Label className="font-semibold text-msep-blue">Capacidades Técnicas</Label>
                                                                <MultiSelect
                                                                    options={availableCapTecnicas
                                                                        .filter(c => !sa.capacidades_tecnicas.includes(c))
                                                                        .map(c => ({ label: c, value: c }))}
                                                                    selected={sa.capacidades_tecnicas}
                                                                    onChange={(selected) => updateSituacao(index, "capacidades_tecnicas", selected)}
                                                                    placeholder="Selecione..."
                                                                    className="w-full"
                                                                />
                                                            </div>

                                                            {/* Capacidades Socioemocionais */}
                                                            <div className="space-y-3">
                                                                <Label className="font-semibold text-msep-blue">Capacidades Socioemocionais</Label>
                                                                <MultiSelect
                                                                    options={availableCapSocio
                                                                        .filter(c => !sa.capacidades_socioemocionais.includes(c))
                                                                        .map(c => ({ label: c, value: c }))}
                                                                    selected={sa.capacidades_socioemocionais}
                                                                    onChange={(selected) => updateSituacao(index, "capacidades_socioemocionais", selected)}
                                                                    placeholder="Selecione..."
                                                                    className="w-full"
                                                                />
                                                            </div>

                                                            {/* Conhecimentos */}
                                                            <div className="md:col-span-2 space-y-3">
                                                                <div className="flex items-center justify-between">
                                                                    <Label className="font-semibold text-msep-blue">Conhecimentos</Label>
                                                                </div>
                                                                <div className="border rounded-md p-4 space-y-4 bg-muted/10">
                                                                    {sa.conhecimentos.map((con, conIndex) => (
                                                                        <KnowledgeItem
                                                                            key={conIndex}
                                                                            item={con}
                                                                            onChange={(newItem) => updateConhecimento(index, conIndex, newItem)}
                                                                            onRemove={() => removeConhecimento(index, conIndex)}
                                                                            allSuggestions={availableConhecimentos}
                                                                            parentContext={null} // Nível raiz não tem pai
                                                                            siblingsDefined={sa.conhecimentos.map(c => c.topico).filter(t => t)} // Passa todos os tópicos raiz para filtrar sugestão
                                                                        />
                                                                    ))}
                                                                    <Button variant="outline" size="sm" onClick={() => addConhecimento(index)} className="w-full border-dashed">
                                                                        <Plus className="h-4 w-4 mr-2" />
                                                                        Adicionar Tópico Principal
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>

                                                <AccordionItem value="desafio">
                                                    <AccordionTrigger>Desafio</AccordionTrigger>
                                                    <AccordionContent>
                                                        <div className="space-y-4 pt-2">
                                                            <div className="grid gap-4 md:grid-cols-2">
                                                                <div className="space-y-2">
                                                                    <Label>Tema / Título</Label>
                                                                    <Input
                                                                        value={sa.tema}
                                                                        onChange={(e) => updateSituacao(index, "tema", e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>Estratégia</Label>
                                                                    <Select
                                                                        value={sa.estrategia}
                                                                        onValueChange={(value) => updateSituacao(index, "estrategia", value)}
                                                                    >
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Selecione..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {STRATEGIES_OPTIONS.map((option) => (
                                                                                <SelectItem key={option.value} value={option.value}>
                                                                                    {option.label}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <Label>Desafio / Contextualização</Label>
                                                                <Textarea
                                                                    className="min-h-[100px]"
                                                                    value={sa.desafio}
                                                                    onChange={(e) => updateSituacao(index, "desafio", e.target.value)}
                                                                />
                                                            </div>

                                                            <div className="space-y-2">
                                                                <Label>Resultados Esperados</Label>
                                                                <Textarea
                                                                    className="min-h-[100px]"
                                                                    value={sa.resultados_esperados}
                                                                    onChange={(e) => updateSituacao(index, "resultados_esperados", e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>

                                                <AccordionItem value="criterios">
                                                    <AccordionTrigger>Critérios de Avaliação</AccordionTrigger>
                                                    <AccordionContent>
                                                        <div className="space-y-4">
                                                            {sa.criterios.map((cri, cIndex) => (
                                                                <Card key={cIndex} className="p-4 bg-muted/20">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <h4 className="font-semibold text-sm">Critério {cIndex + 1}</h4>
                                                                        <Button variant="ghost" size="sm" className="hidden" onClick={() => removeCriterio(index, cIndex)}>
                                                                            <Trash className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button variant="outline" size="sm" onClick={() => removeCriterio(index, cIndex)}>
                                                                            <Trash className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                    <div className="grid gap-4 md:grid-cols-2">
                                                                        <div className="space-y-2">
                                                                            <Label>Tipo</Label>
                                                                            <Select
                                                                                value={cri.tipo}
                                                                                onValueChange={(val: "dicotomico" | "gradual") => updateCriterio(index, cIndex, "tipo", val)}
                                                                            >
                                                                                <SelectTrigger>
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="dicotomico">Dicotômico</SelectItem>
                                                                                    <SelectItem value="gradual">Gradual</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label>Capacidade Relacionada</Label>
                                                                            <Input
                                                                                value={cri.capacidade}
                                                                                onChange={(e) => updateCriterio(index, cIndex, "capacidade", e.target.value)}
                                                                            />
                                                                        </div>
                                                                        <div className="col-span-2 space-y-2">
                                                                            <Label>Critério</Label>
                                                                            <Textarea
                                                                                value={cri.criterio}
                                                                                onChange={(e) => updateCriterio(index, cIndex, "criterio", e.target.value)}
                                                                            />
                                                                        </div>

                                                                        {cri.tipo === "gradual" && (
                                                                            <div className="col-span-2 grid gap-2 md:grid-cols-2 pt-2 border-t">
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-xs">Nível 1 (Desempenho autônomo)</Label>
                                                                                    <Textarea
                                                                                        className="h-20"
                                                                                        value={cri.nivel1 || ""}
                                                                                        onChange={(e) => updateCriterio(index, cIndex, "nivel1", e.target.value)}
                                                                                    />
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-xs">Nível 2 (Desempenho parcialmente autônomo)</Label>
                                                                                    <Textarea
                                                                                        className="h-20"
                                                                                        value={cri.nivel2 || ""}
                                                                                        onChange={(e) => updateCriterio(index, cIndex, "nivel2", e.target.value)}
                                                                                    />
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-xs">Nível 3 (Desempenho apoiado)</Label>
                                                                                    <Textarea
                                                                                        className="h-20"
                                                                                        value={cri.nivel3 || ""}
                                                                                        onChange={(e) => updateCriterio(index, cIndex, "nivel3", e.target.value)}
                                                                                    />
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-xs">Nível 4 (Desempenho não satisfatório)</Label>
                                                                                    <Textarea
                                                                                        className="h-20"
                                                                                        value={cri.nivel4 || ""}
                                                                                        onChange={(e) => updateCriterio(index, cIndex, "nivel4", e.target.value)}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </Card>
                                                            ))}
                                                            <Button variant="outline" size="sm" onClick={() => addCriterio(index)}>
                                                                <Plus className="h-4 w-4 mr-2" />
                                                                Adicionar Critério
                                                            </Button>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>

                                                <AccordionItem value="aulas">
                                                    <AccordionTrigger>Plano de Aula</AccordionTrigger>
                                                    <AccordionContent>
                                                        <div className="space-y-4">
                                                            {sa.plano_aula.map((aula, aIndex) => (
                                                                <Card key={aIndex} className="p-4">
                                                                    <div className="flex justify-between items-center mb-4">
                                                                        <h4 className="font-semibold text-msep-blue">Aula {aIndex + 1}</h4>
                                                                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeAula(index, aIndex)}>
                                                                            <Trash className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                    <div className="grid gap-4 md:grid-cols-2">
                                                                        <div className="space-y-2">
                                                                            <Label>Data / Horas</Label>
                                                                            <Input
                                                                                value={aula.data}
                                                                                placeholder="Ex: 4 horas - 30/01/2026"
                                                                                onChange={(e) => updateAula(index, aIndex, "data", e.target.value)}
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label>Instrumento de Avaliação</Label>
                                                                            <Input
                                                                                value={aula.instrumento}
                                                                                onChange={(e) => updateAula(index, aIndex, "instrumento", e.target.value)}
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label>Capacidades Trabalhadas</Label>
                                                                            <MultiSelect
                                                                                options={Array.from(new Set([...sa.capacidades_tecnicas, ...sa.capacidades_socioemocionais].filter(c => c && c.trim() !== ""))).map(c => ({ label: c, value: c }))}
                                                                                selected={aula.capacidades}
                                                                                onChange={(selected) => updateAula(index, aIndex, "capacidades", selected)}
                                                                                placeholder="Selecione as capacidades..."
                                                                                className="w-full"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label>Conhecimentos</Label>
                                                                            <Textarea
                                                                                className="min-h-[80px]"
                                                                                placeholder="Listar conhecimentos..."
                                                                                value={aula.conhecimentos.join("\n")}
                                                                                onChange={(e) => updateAula(index, aIndex, "conhecimentos", e.target.value.split("\n"))}
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label>Estratégias</Label>
                                                                            <Textarea
                                                                                className="min-h-[80px]"
                                                                                value={aula.estrategias}
                                                                                onChange={(e) => updateAula(index, aIndex, "estrategias", e.target.value)}
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label>Recursos</Label>
                                                                            <Textarea
                                                                                className="min-h-[80px]"
                                                                                value={aula.recursos}
                                                                                onChange={(e) => updateAula(index, aIndex, "recursos", e.target.value)}
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label>Critérios de Avaliação (Aula)</Label>
                                                                            <MultiSelect
                                                                                options={Array.from(new Set(sa.criterios.map(c => c.criterio).filter(c => c && c.trim() !== ""))).map(c => ({ label: c, value: c }))}
                                                                                selected={aula.criterios_avaliacao}
                                                                                onChange={(selected) => updateAula(index, aIndex, "criterios_avaliacao", selected)}
                                                                                placeholder="Selecione os critérios..."
                                                                                className="w-full"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label>Referências</Label>
                                                                            <Textarea
                                                                                className="min-h-[80px]"
                                                                                value={aula.referencias}
                                                                                onChange={(e) => updateAula(index, aIndex, "referencias", e.target.value)}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </Card>
                                                            ))}
                                                            <Button variant="outline" size="sm" onClick={() => addAula(index)}>
                                                                <Plus className="h-4 w-4 mr-2" />
                                                                Adicionar Aula
                                                            </Button>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>

                                                <AccordionItem value="perguntas">
                                                    <AccordionTrigger>Perguntas Mediadoras</AccordionTrigger>
                                                    <AccordionContent>
                                                        <div className="space-y-3 pt-2">
                                                            <div className="flex items-center justify-between">
                                                                <Label>Lista de Perguntas</Label>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => addPergunta(index)}
                                                                    className="h-8 text-xs text-msep-blue hover:text-msep-blue/80"
                                                                >
                                                                    <Plus className="h-3 w-3 mr-1" />
                                                                    Adicionar Pergunta
                                                                </Button>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {sa.perguntas_mediadoras.length > 0 ? (
                                                                    sa.perguntas_mediadoras.map((pergunta, pIndex) => (
                                                                        <div key={pIndex} className="flex gap-2">
                                                                            <Input
                                                                                value={pergunta}
                                                                                onChange={(e) => updatePergunta(index, pIndex, e.target.value)}
                                                                                placeholder="Digite a pergunta mediadora..."
                                                                            />
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                onClick={() => removePergunta(index, pIndex)}
                                                                                className="text-muted-foreground hover:text-destructive shrink-0"
                                                                            >
                                                                                <Trash className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="text-sm text-muted-foreground italic p-2 border border-dashed rounded-md text-center">
                                                                        Nenhuma pergunta mediadora cadastrada.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        </CardContent>
                                    </Card>
                                ))}

                                <Button variant="outline" className="w-full border-dashed" onClick={addSituacao}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Adicionar Situação de Aprendizagem
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </ScrollArea>
        </div>
    )
}
