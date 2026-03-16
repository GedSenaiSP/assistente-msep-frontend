import { v4 as uuidv4 } from "uuid"

const apiUrl = "/api/proxy"

// Tipo para a requisição e resposta da API
export interface ChatRequest {
  message: string
  userId: string
  threadId: string
}

export interface ChatResponse {
  message: string
  title?: string // Campo opcional para o título
  userId: string
  threadId: string
}

// Interface para a resposta do endpoint get_threads_with_titles
export interface ThreadsResponse {
  userId: string
  threads: {
    thread_id: string
    title: string
  }[]
}

// Interface para a resposta do endpoint chat_history
export interface ChatHistoryResponse {
  threadId: string
  messages: {
    type: string
    content: string
    additional_info: {
      id: null | string
    }
    timestamp?: string // Campo adicionado para data/hora real
  }[]
  title: string
}

// Interface para a resposta do endpoint delete_thread
export interface DeleteThreadResponse {
  message: string
  thread_id: string
}

// Interface para a resposta do endpoint configure_model
export interface ConfigureModelResponse {
  message: string
  user_id: string
  temperature: number
  top_p: number
}

// Interface para a requisição do endpoint configure_model
export interface ConfigureModelRequest {
  user_id: string
  temperature: number
  top_p: number
}

// Interface para documentos processados reutilizáveis
export interface ProcessedDocEntry {
  id: string
  original_pdf_filename: string
  created_at: string | null
}

// Adicione estas interfaces para a resposta do endpoint extract_full_details
export interface UCCapabilities {
  CapacidadesTecnicas_list: string[]
  CapacidadesSocioemocionais_list: string[]
}

export interface UCEntry {
  nomeUC: string
  capacidades: UCCapabilities
  conhecimentos?: string[]
  carga_horaria_total?: string  // Ex: "75h" ou "100 horas"
}

// Atualizar a interface FullPlanDetailsResponse para incluir stored_markdown_id
export interface FullPlanDetailsResponse {
  stored_markdown_id: string
  user_id: string
  thread_id: string
  original_pdf_filename?: string
  nomeCurso?: string
  unidadesCurriculares: UCEntry[]
}

// Adicionar interface para a resposta da API de geração de plano de ensino
export interface PlanGenerationResponse {
  userId: string
  threadId: string
  plan_markdown: string
}

// Interface para UC com capacidades selecionadas (Projeto Integrador)
export interface UCCapacidadesSelection {
  nomeUC: string
  capacidades_tecnicas: string[]
  capacidades_socioemocionais: string[]
}

// Interface para situação de aprendizagem
export interface SituacaoAprendizagem {
  capacidades_tecnicas: string[]
  capacidades_socioemocionais: string[]
  estrategia: string
  tema_desafio: string
  // Para Projeto Integrador: múltiplas UCs com suas capacidades
  unidades_curriculares?: UCCapacidadesSelection[]
}

// Interfaces para jobs assíncronos de geração de plano
export type JobStatus = "pending" | "processing" | "completed" | "failed"

export interface JobCreateResponse {
  job_id: string
  status: JobStatus
  message: string
}

export interface JobStatusResponse {
  job_id: string
  status: JobStatus
  progress: number
  current_step: string | null
  result: PlanGenerationResponse | ChatResponse | null
  error: string | null
}

// Callback para atualizar progresso durante polling
export type ProgressCallback = (progress: number, currentStep: string | null) => void

// Adicione esta função auxiliar para gerar respostas de exemplo em Markdown
function getMarkdownResponse(message: string): string {
  // Verifica palavras-chave na mensagem para determinar o tipo de resposta
  if (message.toLowerCase().includes("markdown") || Math.random() > 0.7) {
    const codeBlock = `// Exemplo de estrutura
{
  titulo: "Situação de Aprendizagem 1",
  tipo: "Projeto Integrador",
  duracao: "20 horas"
}`;

    return `# Resposta em Markdown

## Sobre a Metodologia SENAI

A Metodologia SENAI de Educação Profissional (MSEP) é estruturada em:

* **Capacidades técnicas** - conhecimentos e habilidades específicas
* **Capacidades socioemocionais** - comportamentos e atitudes

### Exemplo de Situação de Aprendizagem

Uma situação de aprendizagem bem estruturada deve incluir:

1. Contextualização
2. Desafio ou problema
3. Recursos necessários
4. Critérios de avaliação

\`\`\`
${codeBlock}
\`\`\`

> **Dica:** Sempre alinhe as situações de aprendizagem com as capacidades previstas no plano de curso.

Para mais informações, [consulte a documentação oficial](https://www.senai.br).`;
  } else {
    // Resposta em texto simples
    return `A Metodologia SENAI de Educação Profissional (MSEP) é baseada no desenvolvimento de capacidades técnicas e socioemocionais através de situações de aprendizagem contextualizadas. Posso ajudar com informações específicas sobre algum aspecto da metodologia?`;
  }
}

// Função para verificar o status de um job de chat
export async function getChatJobStatus(jobId: string): Promise<JobStatusResponse> {
  const endpoint = `${apiUrl}/chat/status/${jobId}`

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Erro ao verificar status do job: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

// Função para aguardar a conclusão de um job de chat com polling
async function waitForChatJobCompletion(
  jobId: string,
  onProgress?: ProgressCallback,
  pollingInterval: number = 15000, // 15 segundos entre cada verificação
  maxWaitTime: number = 1800000 // 30 minutos máximo
): Promise<JobStatusResponse> {
  const startTime = Date.now()

  while (true) {
    const status = await getChatJobStatus(jobId)

    // Notificar progresso se callback fornecido
    if (onProgress) {
      onProgress(status.progress, status.current_step)
    }

    // Se completou ou falhou, retornar
    if (status.status === "completed" || status.status === "failed") {
      return status
    }

    // Verificar timeout
    if (Date.now() - startTime > maxWaitTime) {
      throw new Error("Tempo máximo de espera excedido para processamento da mensagem.")
    }

    // Aguardar antes de verificar novamente
    await new Promise(resolve => setTimeout(resolve, pollingInterval))
  }
}

// Função para enviar mensagem para a API com suporte a polling
export async function sendChatMessage(
  message: string,
  threadId: string,
  userId: string,
  onProgress?: ProgressCallback
): Promise<ChatResponse> {
  try {
    const request: ChatRequest = {
      message,
      userId,
      threadId,
    }

    console.log("Iniciando requisição de chat...")

    // Passo 1: Iniciar o job
    const createResponse = await fetch(`${apiUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error("Erro ao iniciar chat:", errorText)
      throw new Error(`Erro na API: ${createResponse.status} - ${errorText}`)
    }

    const jobResponse: JobCreateResponse = await createResponse.json()
    console.log("Job de chat criado:", jobResponse)

    // Notificar progresso inicial
    if (onProgress) {
      onProgress(0, "Processando mensagem...")
    }

    // Passo 2: Fazer polling até completar
    const finalStatus = await waitForChatJobCompletion(jobResponse.job_id, onProgress)

    // Passo 3: Verificar resultado
    if (finalStatus.status === "failed") {
      throw new Error(finalStatus.error || "Erro desconhecido no processamento da mensagem.")
    }

    if (!finalStatus.result) {
      throw new Error("Mensagem processada mas resultado não encontrado.")
    }

    console.log("Resposta do chat recebida:", finalStatus.result)
    return finalStatus.result as ChatResponse

  } catch (error) {
    console.error("Erro ao enviar mensagem:", error)
    // Fallback para quando há um erro geral
    return {
      message: "Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente mais tarde.",
      userId,
      threadId,
    }
  }
}

// Função para obter as conversas do usuário - Corrigida para usar POST
export async function getUserThreads(userId: string): Promise<ThreadsResponse> {
  try {
    const response = await fetch(`${apiUrl}/get_threads_with_titles`, {
      method: "POST", // Alterado para POST
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }), // Passando o userId no corpo da requisição
    })

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Erro ao obter conversas do usuário:", error)
    // Retorna uma resposta vazia em caso de erro
    return {
      userId,
      threads: [],
    }
  }
}

// Função para obter o histórico de uma conversa específica - Corrigida para usar POST
export async function getChatHistory(threadId: string): Promise<ChatHistoryResponse> {
  try {
    const response = await fetch(`${apiUrl}/chat_history`, {
      method: "POST", // Alterado para POST
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ threadId }), // Passando o threadId no corpo da requisição
    })

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Erro ao obter histórico de conversa:", error)
    // Retorna uma resposta vazia em caso de erro
    return {
      threadId,
      messages: [],
      title: "Conversa não encontrada",
    }
  }
}

// Nova função para excluir uma conversa
export async function deleteThread(threadId: string, userId: string): Promise<DeleteThreadResponse> {
  try {
    console.log(`Chamando API para excluir thread: ${apiUrl}/delete_thread/${threadId}`)
    console.log("Parâmetros: threadId =", threadId, "userId =", userId)

    // Criar os dados no formato application/x-www-form-urlencoded
    const formData = new URLSearchParams()
    formData.append("user_id", `${userId}`) // Adicionando aspas conforme o exemplo do curl

    console.log("Enviando requisição DELETE com user_id:", `${userId}`)
    console.log("Body da requisição:", formData.toString())

    const response = await fetch(`${apiUrl}/delete_thread/${threadId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: formData.toString(), // Convertendo para string para enviar como x-www-form-urlencoded
    })

    console.log("Status da resposta:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Erro na resposta da API:", errorText)
      throw new Error(`Erro na API: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log("Resposta da API:", result)
    return result
  } catch (error) {
    console.error("Erro ao excluir conversa:", error)
    throw error
  }
}

// Nova função para configurar o modelo - Modificada para enviar JSON
export async function configureModel(
  userId: string,
  temperature: number,
  topP: number,
): Promise<ConfigureModelResponse> {
  try {
    console.log(`Chamando API para configurar modelo: ${apiUrl}/configure_model`)

    // Criar o objeto JSON para enviar
    const requestData: ConfigureModelRequest = {
      user_id: userId,
      temperature: temperature,
      top_p: topP,
    }

    console.log("Enviando requisição POST com dados:", JSON.stringify(requestData, null, 2))

    const response = await fetch(`${apiUrl}/configure_model`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(requestData), // Enviando como JSON
    })

    console.log("Status da resposta:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Erro na resposta da API:", errorText)
      throw new Error(`Erro na API: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log("Resposta da API:", result)
    return result
  } catch (error) {
    console.error("Erro ao configurar modelo:", error)
    throw error
  }
}

// Função para gerar um novo threadId (UUID)
export function generateThreadId(): string {
  return uuidv4()
}

// Função para verificar o status de um job de extração de PDF
export async function getPdfExtractionStatus(jobId: string): Promise<JobStatusResponse> {
  const endpoint = `${apiUrl}/pdf/extract_status/${jobId}`

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Erro ao verificar status do job de extração: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

// Função para aguardar a conclusão de um job de extração de PDF com polling
async function waitForPdfExtractionCompletion(
  jobId: string,
  onProgress?: ProgressCallback,
  pollingInterval: number = 15000, // 15 segundos entre cada verificação
  maxWaitTime: number = 1800000 // 30 minutos máximo
): Promise<JobStatusResponse> {
  const startTime = Date.now()

  while (true) {
    const status = await getPdfExtractionStatus(jobId)

    // Notificar progresso se callback fornecido
    if (onProgress) {
      onProgress(status.progress, status.current_step)
    }

    // Se completou ou falhou, retornar
    if (status.status === "completed" || status.status === "failed") {
      return status
    }

    // Verificar timeout
    if (Date.now() - startTime > maxWaitTime) {
      throw new Error("Tempo máximo de espera excedido para extração do PDF.")
    }

    // Aguardar antes de verificar novamente
    await new Promise(resolve => setTimeout(resolve, pollingInterval))
  }
}

// Função para processar o plano de curso com suporte a polling
export async function processCoursePlan(
  file: File,
  userId: string,
  threadId: string,
  onProgress?: ProgressCallback
): Promise<FullPlanDetailsResponse> {
  try {
    const endpoint = `${apiUrl}/pdf/extract_full_details`

    // Criar um FormData para enviar o arquivo e os parâmetros
    const formData = new FormData()
    formData.append("file", file)
    formData.append("user_id", userId)
    formData.append("thread_id", threadId)
    formData.append("original_pdf_filename", file.name)

    console.log(`Iniciando extração de plano de curso: ${endpoint}`)
    console.log("Parâmetros: userId =", userId, "threadId =", threadId, "filename =", file.name)

    // Passo 1: Iniciar o job
    const createResponse = await fetch(endpoint, {
      method: "POST",
      body: formData,
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error("Erro ao iniciar extração:", errorText)
      throw new Error(`Erro na API: ${createResponse.status} - ${errorText}`)
    }

    const jobResponse: JobCreateResponse = await createResponse.json()
    console.log("Job de extração criado:", jobResponse)

    // Notificar progresso inicial
    if (onProgress) {
      onProgress(0, "Iniciando extração do PDF...")
    }

    // Passo 2: Fazer polling até completar
    const finalStatus = await waitForPdfExtractionCompletion(jobResponse.job_id, onProgress)

    // Passo 3: Verificar resultado
    if (finalStatus.status === "failed") {
      throw new Error(finalStatus.error || "Erro desconhecido na extração do PDF.")
    }

    if (!finalStatus.result) {
      throw new Error("Extração concluída mas resultado não encontrado.")
    }

    console.log("Extração de plano de curso concluída:", finalStatus.result)
    return finalStatus.result as FullPlanDetailsResponse

  } catch (error) {
    console.error("Erro ao processar plano de curso:", error)
    throw error
  }
}

// Função para verificar o status de um job de geração de plano
export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const endpoint = `${apiUrl}/teaching_plan/status/${jobId}`

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Erro ao verificar status do job: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

// Função para aguardar a conclusão de um job com polling
async function waitForJobCompletion(
  jobId: string,
  onProgress?: ProgressCallback,
  pollingInterval: number = 15000, // 15 segundos entre cada verificação
  maxWaitTime: number = 1200000 // 20 minutos máximo
): Promise<JobStatusResponse> {
  const startTime = Date.now()

  while (true) {
    const status = await getJobStatus(jobId)

    // Notificar progresso se callback fornecido
    if (onProgress) {
      onProgress(status.progress, status.current_step)
    }

    // Se completou ou falhou, retornar
    if (status.status === "completed" || status.status === "failed") {
      return status
    }

    // Verificar timeout
    if (Date.now() - startTime > maxWaitTime) {
      throw new Error("Tempo máximo de espera excedido para geração do plano.")
    }

    // Aguardar antes de verificar novamente
    await new Promise(resolve => setTimeout(resolve, pollingInterval))
  }
}

// Função para gerar plano de ensino com suporte a polling
export async function generateTeachingPlanAPI(
  userId: string,
  threadId: string,
  storedMarkdownId: string,
  docente: string,
  escola: string,
  curso: string,
  turma: string,
  modalidade: string,
  uc: string,
  situacoesAprendizagem: SituacaoAprendizagem[],
  horarios: Array<{ dia: string; horaInicio: string; horaFim: string }>,
  department: string,
  startDate: string,
  endDate: string,
  onProgress?: ProgressCallback
): Promise<PlanGenerationResponse> {
  try {
    const endpoint = `${apiUrl}/teaching_plan/generate`

    const payload = {
      user_id: userId,
      thread_id: threadId,
      stored_markdown_id: storedMarkdownId,
      docente: docente,
      escola: escola,
      curso: curso,
      turma: turma,
      modalidade: modalidade,
      uc: uc,
      situacoes_aprendizagem: situacoesAprendizagem,
      horarios: horarios,
      departamento_regional: department,
      data_inicio: startDate,
      data_fim: endDate,
    }

    console.log(`Iniciando geração de plano de ensino: ${endpoint}`)
    console.log("Payload:", JSON.stringify(payload, null, 2))

    // Passo 1: Iniciar o job
    const createResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error("Erro ao iniciar geração:", errorText)
      throw new Error(`Erro na API: ${createResponse.status} - ${errorText}`)
    }

    const jobResponse: JobCreateResponse = await createResponse.json()
    console.log("Job criado:", jobResponse)

    // Notificar progresso inicial
    if (onProgress) {
      onProgress(0, "Geração iniciada...")
    }

    // Passo 2: Fazer polling até completar
    const finalStatus = await waitForJobCompletion(jobResponse.job_id, onProgress)

    // Passo 3: Verificar resultado
    if (finalStatus.status === "failed") {
      throw new Error(finalStatus.error || "Erro desconhecido na geração do plano.")
    }

    if (!finalStatus.result) {
      throw new Error("Plano gerado mas resultado não encontrado.")
    }

    console.log("Plano gerado com sucesso:", finalStatus.result)
    return finalStatus.result as PlanGenerationResponse

  } catch (error) {
    console.error("Erro ao gerar plano de ensino:", error)
    throw error
  }
}

// Novas interfaces para os planos salvos
export interface PlanSummary {
  plan_id: string;
  nome_uc: string | null;
  turma: string | null;
  escola: string | null;
  curso: string | null;
  departamento_regional: string | null;
  docente: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  contagem_sa_por_tipo: Record<string, number> | null;
  status: string | null;
  arquivado: boolean | null;
  publico: boolean | null;
  // Token metrics
  input_tokens: number | null;
  output_tokens: number | null;
}

export interface GetPlansResponse {
  user_id: string;
  plans: PlanSummary[];
}

export interface PlanInfo {
  id: string
  curso: string
  turma: string
  unidadeCurricular: string
  escola: string
  cargaHoraria: string
  quantidadeSituacoes: number
  tiposSituacoes: string[]
  data_inicio: string
  data_fim: string
}

// Função para mapear o resumo do plano para as informações do card
export function mapSummaryToPlanInfo(summary: PlanSummary): PlanInfo {
  const { plan_id, nome_uc, turma, escola, curso, contagem_sa_por_tipo, data_inicio, data_fim } = summary;

  const quantidadeSituacoes = contagem_sa_por_tipo ? Object.values(contagem_sa_por_tipo).reduce((sum, count) => sum + count, 0) : 0;
  const tiposSituacoes = contagem_sa_por_tipo ? Object.keys(contagem_sa_por_tipo) : [];

  return {
    id: plan_id,
    unidadeCurricular: nome_uc || "Unidade Curricular não informada",
    turma: turma || "Turma não informada",
    escola: escola || "Escola não informada",
    curso: curso || "Curso não informado",
    quantidadeSituacoes,
    tiposSituacoes,
    data_inicio: data_inicio || "",
    data_fim: data_fim || "",
    // Campos não presentes no resumo são preenchidos com valores padrão
    cargaHoraria: "N/D",
  };
}


export interface SinglePlanResponse {
  thread_id: string
  plan_content: {
    plano_de_ensino: {
      informacoes_curso: {
        curso: string
        turma: string
        unidade_curricular: string
        carga_horaria_total: string
        professor: string
        modalidade: string
        unidade: string
        objetivo?: string
        departamento_regional?: string
        data_inicio?: string
        data_fim?: string
      }
      situacoes_aprendizagem: Array<{
        estrategia_aprendizagem: {
          tipo: string
        }
        [key: string]: any
      }>
    }
  }
  [key: string]: any
}

// Nova função para obter todos os IDs de planos do usuário
export async function getUserPlans(userId: string, filters?: { department?: string, school?: string, archived?: boolean }): Promise<GetPlansResponse> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append("user_id", userId);
    if (filters?.department) {
      queryParams.append("departamento_regional", filters.department);
    }
    if (filters?.school) {
      queryParams.append("escola", filters.school);
    }
    if (filters?.archived !== undefined) {
      queryParams.append("arquivado", filters.archived.toString());
    }

    const response = await fetch(`${apiUrl}/plans?${queryParams.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Erro na API ao buscar planos: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Erro ao obter planos do usuário:", error)
    // Retorna uma resposta vazia em caso de erro para não quebrar a UI
    return {
      user_id: userId,
      plans: [],
    }
  }
}

// Função para obter planos públicos (aprovados e compartilhados)
export async function getPublicPlans(): Promise<GetPlansResponse> {
  try {
    const response = await fetch(`${apiUrl}/plans/public`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Erro na API ao buscar planos públicos: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Erro ao obter planos públicos:", error)
    return {
      user_id: "public",
      plans: [],
    }
  }
}

// Função para alternar a visibilidade pública de um plano
export async function togglePlanPublic(planId: string): Promise<{ plan_id: string; publico: boolean; message: string }> {
  try {
    const response = await fetch(`${apiUrl}/plan/toggle_public`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan_id: planId }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Erro na API: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Erro ao alternar visibilidade do plano ${planId}:`, error)
    throw error
  }
}


// Nova função para obter informações de um plano específico
export async function getSinglePlan(planId: string): Promise<SinglePlanResponse> {
  try {
    const response = await fetch(`${apiUrl}/get_single_plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan_id: planId }),
    })

    if (!response.ok) {
      throw new Error(`Erro na API ao buscar plano único: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Erro ao obter plano específico ${planId}:`, error)
    throw error
  }
}

// Função auxiliar para extrair informações resumidas do plano
export function extractPlanInfo(planData: SinglePlanResponse, planId: string): PlanInfo {
  const informacoesCurso = planData.plan_content?.plano_de_ensino?.informacoes_curso
  const situacoesAprendizagem = planData.plan_content?.plano_de_ensino?.situacoes_aprendizagem || []

  const quantidadeSituacoes = situacoesAprendizagem.length
  const tiposSituacoes = situacoesAprendizagem.map((sa) => sa.estrategia_aprendizagem?.tipo || "Não definido")

  return {
    id: planId,
    curso: informacoesCurso?.curso || "Não definido",
    turma: informacoesCurso?.turma || "Não definida",
    unidadeCurricular: informacoesCurso?.unidade_curricular || "Não definida",
    escola: informacoesCurso?.unidade || "Não definida",
    cargaHoraria: informacoesCurso?.carga_horaria_total || "Não definida",
    quantidadeSituacoes: quantidadeSituacoes,
    tiposSituacoes: tiposSituacoes,
  }
}

// Nova função para renomear uma conversa
export async function renameThread(userId: string, threadId: string, newTitle: string): Promise<{ message: string }> {
  try {
    const response = await fetch(`${apiUrl}/thread/rename`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        thread_id: threadId,
        new_title: newTitle,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Erro na API: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Erro ao renomear conversa:", error)
    throw error
  }
}

// Nova função para definir o departamento regional do usuário
export async function setDepartment(userId: string, department: string): Promise<{ message: string }> {
  try {
    const response = await fetch(`${apiUrl}/user/set_department`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        departamento_regional: department,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Erro na API: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Erro ao definir departamento:", error)
    throw error
  }
}

// Interface para a resposta de configuração do usuário
export interface UserConfigResponse {
  user_id: string
  departamento_regional: string | null
}

// Nova função para obter a configuração do usuário
export async function getUserConfig(userId: string): Promise<UserConfigResponse> {
  try {
    const response = await fetch(`${apiUrl}/user/config/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        // Se o usuário não for encontrado, retorne um valor padrão
        return { user_id: userId, departamento_regional: null }
      }
      throw new Error(`Erro na API ao buscar configuração do usuário: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Erro ao obter configuração do usuário:", error)
    // Retorna um valor padrão em caso de erro para não quebrar a UI
    return {
      user_id: userId,
      departamento_regional: null,
    }
  }
}

// Nova função para exportar o plano para DOCX
export async function exportPlanToDocx(planId: string, turma: string, unidadeCurricular: string): Promise<void> {
  try {
    const response = await fetch(`${apiUrl}/export/docx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan_id: planId }),
    })

    if (!response.ok) {
      throw new Error(`Erro na API ao exportar plano: ${response.status}`)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url

    // Sanitiza e cria o nome do arquivo dinamicamente
    const safeTurma = turma.replace(/\s+/g, "_")
    const safeUnidadeCurricular = unidadeCurricular.replace(/\s+/g, "-")
    const filename = `${safeTurma}_${safeUnidadeCurricular}.docx`

    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error(`Erro ao exportar plano ${planId}:`, error)
    throw error // Re-throw para que o chamador possa lidar com o erro (ex: mostrar um toast)
  }
}

// Interfaces for User Management
export interface User {
  user_id: string
  full_name: string
  email?: string
  role: "docente" | "coordenador" | "administracao_regional" | "administracao_nacional"
  departamento_regional?: string
  escola?: string
}

export interface UserListResponse {
  users: User[]
}

export interface UserRoleResponse {
  role: "docente" | "coordenador" | "administracao_regional" | "administracao_nacional"
}

// Function to get all users
export async function getUsers(): Promise<UserListResponse> {
  try {
    const response = await fetch(`${apiUrl}/users`)

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error("Error fetching users:", error)
    // Return an empty list on error to avoid breaking the UI
    return { users: [] }
  }
}

// Function to get a single user by ID
export async function getUser(userId: string): Promise<User | null> {
  try {
    const response = await fetch(`${apiUrl}/user/${userId}`)

    if (!response.ok) {
      if (response.status === 404) {
        return null // User not found
      }
      throw new Error(`API Error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error)
    return null
  }
}

// Function to get a single user's role
export async function getUserRole(userId: string): Promise<UserRoleResponse | null> {
  try {
    const response = await fetch(`${apiUrl}/user/${userId}/role`)

    if (!response.ok) {
      if (response.status === 404) {
        return null // User not found
      }
      throw new Error(`API Error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error(`Error fetching role for user ${userId}:`, error)
    throw error
  }
}

// Function to create or update a user
export async function upsertUser(user: Partial<User>): Promise<User> {
  try {
    const response = await fetch(`${apiUrl}/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("API Error on upsertUser:", errorData) // Log the full error
      const errorMessage =
        typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData)
      throw new Error(errorMessage || `API Error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error upserting user:", error)
    throw error
  }
}

// Function to save a manually created plan
export async function saveManualPlan(planData: any): Promise<any> {
  try {
    const response = await fetch(`${apiUrl}/plan/manual`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(planData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `API Error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error saving manual plan:", error)
    throw error
  }
}

// Interfaces for AI Review
export interface AIReviewRequest {
  html_content: string;
  capacidades_tecnicas: string[];
  capacidades_socioemocionais: string[];
  conhecimentos: string[];
  user_instruction: string;
}

export interface AIReviewResponse {
  revised_html_content: string;
}

// Function to get AI review for a text
export async function reviewTextWithAI(data: AIReviewRequest): Promise<AIReviewResponse> {
  try {
    const response = await fetch(`${apiUrl}/ai/review-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `API Error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    throw error
  }
}

// Função para enviar mensagem com arquivos - com suporte a polling
export async function sendChatMessageWithFiles(
  message: string,
  files: File[],
  threadId: string,
  userId: string,
  onProgress?: ProgressCallback
): Promise<ChatResponse> {
  try {
    const formData = new FormData()
    formData.append("message", message)
    formData.append("userId", userId)
    formData.append("threadId", threadId)
    files.forEach((file) => {
      formData.append("files", file)
    })

    console.log("Iniciando requisição de chat com arquivos...")

    // Passo 1: Iniciar o job
    const createResponse = await fetch(`${apiUrl}/chat/upload`, {
      method: "POST",
      body: formData,
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error("Erro ao iniciar chat com upload:", errorText)
      throw new Error(`Erro na API: ${createResponse.status} - ${errorText}`)
    }

    const jobResponse: JobCreateResponse = await createResponse.json()
    console.log("Job de chat/upload criado:", jobResponse)

    // Notificar progresso inicial
    if (onProgress) {
      onProgress(0, "Processando arquivos...")
    }

    // Passo 2: Fazer polling até completar
    const finalStatus = await waitForChatJobCompletion(jobResponse.job_id, onProgress)

    // Passo 3: Verificar resultado
    if (finalStatus.status === "failed") {
      throw new Error(finalStatus.error || "Erro desconhecido no processamento.")
    }

    if (!finalStatus.result) {
      throw new Error("Mensagem processada mas resultado não encontrado.")
    }

    console.log("Resposta do chat/upload recebida:", finalStatus.result)
    return finalStatus.result as ChatResponse

  } catch (error) {
    console.error("Erro ao enviar mensagem com arquivos:", error)
    throw error
  }
}

// Interfaces for Metrics
export interface MetricsData {
  total_users: number
  total_plans: number
  plans_per_day: Array<{ date: string; count: number }>
  ranking_by_department: Array<{ name: string; user_count: number; plan_count: number; departamento_regional: string | null; escola: string | null }>
  ranking_by_school: Array<{ name: string; user_count: number; plan_count: number; departamento_regional: string | null; escola: string | null }>
  ranking_by_docente: Array<{ name: string; user_count: number; plan_count: number; departamento_regional: string | null; escola: string | null }>
  contagem_geral_sa_por_tipo: { [key: string]: number } | null
  // Token metrics for PLANS
  total_input_tokens: number
  total_output_tokens: number
  avg_input_tokens_per_plan: number
  avg_output_tokens_per_plan: number
  // Token metrics for ALL CONVERSATIONS
  total_input_tokens_conversations: number
  total_output_tokens_conversations: number
  avg_input_tokens_per_conversation: number
  avg_output_tokens_per_conversation: number
}

// Function to get metrics
export async function getMetrics(userId: string, role: string): Promise<MetricsData> {
  let endpoint = "";

  switch (role) {
    case "administracao_nacional":
      endpoint = `${apiUrl}/metrics?user_id=${userId}`;
      break;
    case "coordenador":
      endpoint = `${apiUrl}/metrics/by_school?user_id=${userId}`;
      break;
    case "administracao_regional":
      endpoint = `${apiUrl}/metrics/by_department?user_id=${userId}`;
      break;
    default:
      // Opcional: Lidar com roles não esperadas, talvez lançando um erro ou retornando dados vazios
      console.error("Role not supported for metrics:", role);
      throw new Error("Role not supported for metrics");
  }

  try {
    const response = await fetch(endpoint, {
      method: "GET", // O método agora é GET
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching metrics:", error);
    throw error;
  }
}


// Nova função para alterar o estado de um plano (arquivar/desarquivar)
export async function updatePlanArchiveState(planId: string, archived: boolean): Promise<{ message: string }> {
  try {
    const response = await fetch(`${apiUrl}/plan/archive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        archived: archived,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Erro na API: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Erro ao atualizar o estado do plano:", error)
    throw error
  }
}

// Tipos para status de aprovação do plano
export type PlanStatusType = "gerado" | "submetido" | "retornado" | "aprovado"

// Interface para entrada do histórico de status
export interface StatusHistoryEntry {
  id: string
  previous_status: string | null
  new_status: string
  comment: string | null
  changed_by_user_id: string
  changed_by_name: string | null
  created_at: string
}

// Interface para resposta do histórico
export interface StatusHistoryResponse {
  plan_id: string
  history: StatusHistoryEntry[]
}

// Função para atualizar o status de aprovação de um plano (com comentário opcional)
export async function updatePlanStatus(
  planId: string,
  newStatus: PlanStatusType,
  userId: string,
  comment?: string
): Promise<{ message: string }> {
  try {
    const response = await fetch(`${apiUrl}/plan/update_status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        new_state: newStatus,
        user_id: userId,
        comment: comment || null,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Erro na API: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Erro ao atualizar status do plano:", error)
    throw error
  }
}

// Função para buscar o histórico de status de um plano
export async function getPlanStatusHistory(planId: string): Promise<StatusHistoryResponse> {
  try {
    const response = await fetch(`${apiUrl}/plan/${planId}/history`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Erro na API: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Erro ao buscar histórico do plano:", error)
    throw error
  }
}

// ============================================================================
// RECURSOS DIDÁTICOS
// ============================================================================

export interface DidacticResourceJobResponse {
  job_id: string
  resource_id: string
  status: string
  message: string
}

export interface DidacticResource {
  id: string
  plan_id: string
  sa_index: number
  title: string
  gcs_url: string | null
  num_chapters: number
  status: "pending" | "processing" | "completed" | "failed"
  error: string | null
  created_at: string | null
  updated_at: string | null
}

export interface DidacticResourceListResponse {
  plan_id: string
  resources: DidacticResource[]
}

// Função para iniciar geração de recurso didático
export async function generateDidacticResource(
  planId: string,
  saIndex: number,
  numChapters: number,
  userId: string
): Promise<DidacticResourceJobResponse> {
  try {
    const response = await fetch(`${apiUrl}/didactic-resource/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        sa_index: saIndex,
        num_chapters: numChapters,
        user_id: userId,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Erro na API: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Erro ao iniciar geração de recurso didático:", error)
    throw error
  }
}

// Função para consultar status do job de recurso didático
export async function getDidacticResourceStatus(jobId: string): Promise<JobStatusResponse> {
  try {
    const response = await fetch(`${apiUrl}/didactic-resource/status/${jobId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Erro na API: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Erro ao consultar status do recurso:", error)
    throw error
  }
}

// Função para listar recursos didáticos de um plano
export async function listDidacticResources(planId: string): Promise<DidacticResource[]> {
  try {
    const response = await fetch(`${apiUrl}/didactic-resources/${planId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Erro na API: ${response.status}`)
    }

    const data: DidacticResourceListResponse = await response.json()
    return data.resources
  } catch (error) {
    console.error("Erro ao listar recursos didáticos:", error)
    return []
  }
}

// Função para baixar recurso didático
export async function downloadDidacticResource(resourceId: string, title: string): Promise<void> {
  try {
    const response = await fetch(`${apiUrl}/didactic-resource/download/${resourceId}`, {
      method: "GET",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Erro na API: ${response.status}`)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url

    // Sanitiza o nome do arquivo
    const safeTitle = title.replace(/[^a-zA-Z0-9\s-_]/g, "").trim()
    a.download = `${safeTitle.substring(0, 50)}.docx`

    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error(`Erro ao baixar recurso ${resourceId}:`, error)
    throw error
  }
}

// Função para gerar recurso com polling
export async function generateDidacticResourceWithPolling(
  planId: string,
  saIndex: number,
  numChapters: number,
  userId: string,
  onProgress?: (progress: number, step: string) => void
): Promise<{ resourceId: string; title: string }> {
  // Iniciar geração
  const jobResponse = await generateDidacticResource(planId, saIndex, numChapters, userId)

  if (onProgress) {
    onProgress(0, "Geração iniciada...")
  }

  // Polling até completar
  const pollingInterval = 15000 // 15 segundos
  const maxWaitTime = 1800000 // 30 minutos (recurso pode demorar)
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitTime) {
    await new Promise((resolve) => setTimeout(resolve, pollingInterval))

    const status = await getDidacticResourceStatus(jobResponse.job_id)

    if (onProgress && status.current_step) {
      onProgress(status.progress, status.current_step)
    }

    if (status.status === "completed") {
      return {
        resourceId: jobResponse.resource_id,
        title: status.result?.title || "Recurso Didático",
      }
    }

    if (status.status === "failed") {
      throw new Error(status.error || "Erro na geração do recurso didático")
    }
  }

  throw new Error("Timeout: geração do recurso demorou muito")
}

// ============================================================
// SLIDES API
// ============================================================

export interface SlideResourceJobResponse {
  job_id: string
  resource_id: string
  status: string
  message: string
}

export interface SlideResource {
  id: string
  plan_id: string
  sa_index: number
  title: string | null
  num_slides: number | null
  status: string
  gcs_blob_name: string | null
  error: string | null
  created_at: string | null
  updated_at: string | null
}

export interface SlideResourceListResponse {
  resources: SlideResource[]
  total: number
}

// Tipo de template disponível
export type SlideTemplate = "dn" | "sp"

// Função para gerar slides
export async function generateSlides(
  planId: string,
  saIndex: number,
  numSlides: number = 30,
  template: SlideTemplate = "dn"
): Promise<SlideResourceJobResponse> {
  try {
    const response = await fetch(`${apiUrl}/slides/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        sa_index: saIndex,
        num_slides: numSlides,
        template: template,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Erro na API: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Erro ao iniciar geração de slides:", error)
    throw error
  }
}

// Função para consultar status de slides
export async function getSlidesStatus(jobId: string): Promise<JobStatusResponse> {
  try {
    const response = await fetch(`${apiUrl}/slides/status/${jobId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Erro na API: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Erro ao consultar status dos slides:", error)
    throw error
  }
}

// Função para listar slides de um plano
export async function listSlideResources(planId: string): Promise<SlideResource[]> {
  try {
    const response = await fetch(`${apiUrl}/slides/${planId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Erro na API: ${response.status}`)
    }

    const data: SlideResourceListResponse = await response.json()
    return data.resources
  } catch (error) {
    console.error("Erro ao listar slides:", error)
    return []
  }
}

// Função para baixar slides
export async function downloadSlides(resourceId: string, title: string): Promise<void> {
  try {
    const response = await fetch(`${apiUrl}/slides/download/${resourceId}`, {
      method: "GET",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Erro na API: ${response.status}`)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${title || "Apresentacao"}.pptx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Erro ao baixar slides:", error)
    throw error
  }
}

// Função para gerar slides com polling
export async function generateSlidesWithPolling(
  planId: string,
  saIndex: number,
  numSlides: number,
  template: SlideTemplate = "dn",
  onProgress?: (progress: number, step: string) => void
): Promise<{ resourceId: string; title: string; numSlides: number }> {
  // Iniciar geração
  const jobResponse = await generateSlides(planId, saIndex, numSlides, template)

  if (onProgress) {
    onProgress(0, "Geração de slides iniciada...")
  }

  // Polling até completar
  const pollingInterval = 15000 // 15 segundos
  const maxWaitTime = 1800000 // 30 minutos
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitTime) {
    await new Promise((resolve) => setTimeout(resolve, pollingInterval))

    const status = await getSlidesStatus(jobResponse.job_id)

    if (onProgress && status.current_step) {
      onProgress(status.progress, status.current_step)
    }

    if (status.status === "completed") {
      return {
        resourceId: jobResponse.resource_id,
        title: status.result?.title || "Apresentação",
        numSlides: status.result?.num_slides || 0,
      }
    }

    if (status.status === "failed") {
      throw new Error(status.error || "Erro na geração dos slides")
    }
  }

  throw new Error("Timeout: geração dos slides demorou muito")
}

// Interface para requisição de exercícios
interface GenerateExercisesRequest {
  user_id: string
  plan_id: number | string // Aceita string pois convertemos no backend
  sa_index: number
  quantities: {
    multiple_choice: number
    essay: number
    fill_in_the_blank: number
    practical: number
  }
}

// Função para iniciar geração de exercícios
export async function generateExercises(
  planId: string,
  saIndex: number,
  quantities: { multiple_choice: number; essay: number; fill_in_the_blank: number; practical: number },
  userId: string
): Promise<DidacticResourceJobResponse> {

  try {
    const response = await fetch(`${apiUrl}/exercises/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        plan_id: planId,
        sa_index: saIndex,
        quantities: quantities,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Erro na API: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Erro ao iniciar geração de exercícios:", error)
    throw error
  }
}

// Função para gerar exercícios com polling
export async function generateExercisesWithPolling(
  planId: string,
  saIndex: number,
  quantities: { multiple_choice: number; essay: number; fill_in_the_blank: number; practical: number },
  userId: string,
  onProgress?: (progress: number, step: string) => void
): Promise<{ resourceId: string; title: string }> {

  const jobResponse = await generateExercises(planId, saIndex, quantities, userId)

  if (onProgress) {
    onProgress(0, "Geração de exercícios iniciada...")
  }

  const pollingInterval = 15000 // 15 segundos
  const maxWaitTime = 1800000 // 30 minutos
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitTime) {
    await new Promise((resolve) => setTimeout(resolve, pollingInterval))

    const status = await getDidacticResourceStatus(jobResponse.job_id)

    if (onProgress && status.current_step) {
      onProgress(status.progress, status.current_step)
    }

    if (status.status === "completed") {
      const result = status.result as any
      return {
        resourceId: result?.resource_id || jobResponse.resource_id,
        title: result?.title || "Lista de Exercícios",
      }
    }

    if (status.status === "failed") {
      throw new Error(status.error || "Erro na geração")
    }
  }

  throw new Error("Timeout: geração demorou muito")
}

// ============================================================
// PREVIEW DE DOCUMENTOS
// ============================================================

/**
 * Retorna a URL de preview do plano de ensino (PDF).
 */
export function getPlanPreviewUrl(planId: string): string {
  return `${apiUrl}/plan/${planId}/preview`
}

/**
 * Retorna a URL de preview do recurso didático (caderno de estudo).
 */
export function getDidacticResourcePreviewUrl(resourceId: string): string {
  return `${apiUrl}/didactic-resource/${resourceId}/preview`
}

/**
 * Retorna a URL de preview dos slides.
 */
export function getSlidesPreviewUrl(resourceId: string): string {
  return `${apiUrl}/slides/${resourceId}/preview`
}

/**
 * Retorna a URL de preview da lista de exercícios.
 */
export function getExercisesPreviewUrl(resourceId: string): string {
  return `${apiUrl}/exercises/${resourceId}/preview`
}

/**
 * Retorna a URL de download do recurso didático.
 */
export function getDidacticResourceDownloadUrl(resourceId: string): string {
  return `${apiUrl}/didactic-resource/download/${resourceId}`
}

/**
 * Retorna a URL de download dos slides.
 */
export function getSlidesDownloadUrl(resourceId: string): string {
  return `${apiUrl}/slides/download/${resourceId}`
}

/**
 * Lista documentos de plano de curso já processados para o usuário.
 * Retorna apenas o mais recente de cada filename.
 */
export async function fetchProcessedDocuments(userId: string): Promise<ProcessedDocEntry[]> {
  const response = await fetch(`${apiUrl}/processed_documents?user_id=${encodeURIComponent(userId)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    console.error("Erro ao listar documentos processados")
    return []
  }

  const data = await response.json()
  return data.documents || []
}

/**
 * Recupera o conteúdo de um documento processado anteriormente para reutilização.
 */
export async function getProcessedDocument(docId: string): Promise<FullPlanDetailsResponse | null> {
  const response = await fetch(`${apiUrl}/processed_documents/${encodeURIComponent(docId)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    console.error(`Erro ao recuperar documento processado: ${docId}`)
    return null
  }

  return await response.json()
}
