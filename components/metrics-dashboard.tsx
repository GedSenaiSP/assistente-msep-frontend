'use client'

import { useEffect, useState, useMemo } from "react"
import { Loader2, Users, FileText, TrendingUp, Trophy, Search, Building } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend, Line, LineChart } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"

import { getMetrics, type MetricsData } from "@/services/api"

import { useSession } from "next-auth/react"
import { useApp } from "@/contexts/app-context"

export function MetricsDashboard() {
  const { data: session } = useSession()
  const { userRole: contextUserRole } = useApp()
  const [data, setData] = useState<MetricsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [schoolSearch, setSchoolSearch] = useState("")
  const [docenteSearch, setDocenteSearch] = useState("")

  const userRole = contextUserRole

  const userId = session?.user?.id

  useEffect(() => {
    async function loadMetrics() {
      if (userId && userRole) {
        try {
          setIsLoading(true)
          const metrics = await getMetrics(userId, userRole)
          setData(metrics)
        } catch (error) {
          console.error("Failed to load metrics:", error)
          toast({ title: "Erro ao carregar métricas", variant: "destructive" })
        } finally {
          setIsLoading(false)
        }
      }
    }
    loadMetrics()
  }, [userId, userRole])

  const processedData = useMemo(() => {
    if (!data) return null

    const plansPerUser = data.total_users > 0 ? (data.total_plans / data.total_users).toFixed(1) : "0"
    const topDepartment = data.ranking_by_department.reduce((prev, current) => (prev.plan_count > current.plan_count) ? prev : current, { name: "N/A", plan_count: 0, departamento_regional: null, escola: null })
    const topSchool = data.ranking_by_school.reduce((prev, current) => (prev.plan_count > current.plan_count) ? prev : current, { name: "N/A", plan_count: 0, departamento_regional: null, escola: null })
    const topDocente = data.ranking_by_docente.reduce((prev, current) => (prev.plan_count > current.plan_count) ? prev : current, { name: "N/A", plan_count: 0, departamento_regional: null, escola: null })

    const saCounts = {
      situacaoProblema: data.contagem_geral_sa_por_tipo?.["Situação Problema"] ?? 0,
      projetos: data.contagem_geral_sa_por_tipo?.["Projetos"] ?? 0,
      estudoDeCaso: data.contagem_geral_sa_por_tipo?.["Estudo de Caso"] ?? 0,
      pesquisaAplicada: data.contagem_geral_sa_por_tipo?.["Pesquisa Aplicada"] ?? 0,
    }

    const filteredSchools = data.ranking_by_school
      .map(school => ({
        ...school,
        avg: school.user_count > 0 ? (school.plan_count / school.user_count).toFixed(1) : "0",
      }))
      .filter(school =>
        school.name.toLowerCase().includes(schoolSearch.toLowerCase()) ||
        school.departamento_regional?.toLowerCase().includes(schoolSearch.toLowerCase())
      )
      .sort((a, b) => b.plan_count - a.plan_count)

    const filteredDocentes = data.ranking_by_docente
      .filter(docente =>
        docente.name.toLowerCase().includes(docenteSearch.toLowerCase()) ||
        docente.escola?.toLowerCase().includes(docenteSearch.toLowerCase()) ||
        docente.departamento_regional?.toLowerCase().includes(docenteSearch.toLowerCase())
      )
      .sort((a, b) => b.plan_count - a.plan_count)

    const plansPerDay = data.plans_per_day
      ? [...data.plans_per_day]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(item => ({
          date: item.date.split('-').reverse().slice(0, 2).join('/'),
          fullDate: item.date,
          count: item.count
        }))
      : []

    return {
      totalUsers: data.total_users,
      totalPlans: data.total_plans,
      plansPerUser,
      topDepartment: topDepartment.name,
      topSchool: topSchool.name,
      topDocente: topDocente.name,
      schools: filteredSchools,
      docentes: filteredDocentes,
      departments: [...data.ranking_by_department].sort((a, b) => b.plan_count - a.plan_count),
      plansPerDay,
      ...saCounts,
    }
  }, [data, schoolSearch, docenteSearch])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Carregando métricas...</span>
      </div>
    )
  }

  if (!data || !processedData) {
    return <p>Não foi possível carregar os dados.</p>
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Usuários</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{processedData.totalUsers}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Planos Gerados</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{processedData.totalPlans}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Média de Planos / Usuário</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{processedData.plansPerUser}</div></CardContent></Card>
        {userRole !== "coordenador" && (
          <>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Departamento Destaque</CardTitle><Trophy className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{processedData.topDepartment}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Escola Destaque</CardTitle><Building className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{processedData.topSchool}</div></CardContent></Card>
          </>
        )}
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Docente Destaque</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{processedData.topDocente}</div></CardContent></Card>
      </div>

      {/* SA KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">SAs de Situação Problema</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{processedData.situacaoProblema}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">SAs de Projetos</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{processedData.projetos}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">SAs de Estudo de Caso</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{processedData.estudoDeCaso}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">SAs de Pesquisa Aplicada</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{processedData.pesquisaAplicada}</div></CardContent></Card>
      </div>


      {/* Token KPI Cards - PLANOS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tokens Entrada (Planos)</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{(data.total_input_tokens || 0).toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tokens Saída (Planos)</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{(data.total_output_tokens || 0).toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Média Entrada/Plano</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{(data.avg_input_tokens_per_plan || 0).toFixed(0)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Média Saída/Plano</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{(data.avg_output_tokens_per_plan || 0).toFixed(0)}</div></CardContent></Card>
      </div>

      {/* Token KPI Cards - CONVERSAS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tokens Entrada (Conversas)</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{(data.total_input_tokens_conversations || 0).toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tokens Saída (Conversas)</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{(data.total_output_tokens_conversations || 0).toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Média Entrada/Conversa</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{(data.avg_input_tokens_per_conversation || 0).toFixed(0)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Média Saída/Conversa</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{(data.avg_output_tokens_per_conversation || 0).toFixed(0)}</div></CardContent></Card>
      </div>

      {/* Gráfico de Evolução Temporal */}
      {processedData.plansPerDay.length > 0 && (
        <Card className="col-span-1 md:col-span-2 lg:col-span-4">
          <CardHeader><CardTitle>Evolução de Planos Gerados</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer className="h-[300px] w-full" config={{}}>
              <LineChart data={processedData.plansPerDay} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                <Legend />
                <Line type="monotone" dataKey="count" name="Planos Gerados" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <div className={`grid gap-6 ${userRole === 'coordenador' ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
        {/* Gráfico de Departamentos */}
        {userRole !== "coordenador" && (
          <Card>
            <CardHeader><CardTitle>Desempenho por Departamento Regional</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer className="h-[300px] w-full" config={{}}>
                <BarChart data={processedData.departments} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" dataKey="plan_count" />
                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={40} />
                  <ChartTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="plan_count" name="Nº de Planos" fill="hsl(var(--primary))" radius={4} />
                  <Bar dataKey="user_count" name="Nº de Usuários" fill="hsl(210 40% 70%)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Tabela de Escolas */}
        {userRole !== "coordenador" && (
          <Card>
            <CardHeader>
              <CardTitle>Ranking de Desempenho por Escola</CardTitle>
              <div className="mt-4 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Buscar por escola ou departamento..." value={schoolSearch} onChange={(e) => setSchoolSearch(e.target.value)} className="pl-8 w-full" />
              </div>
            </CardHeader>
            <CardContent>
              {/* Desktop Table */}
              <div className="hidden md:block max-h-[300px] overflow-y-auto overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Escola</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead className="text-right">Planos</TableHead>
                      <TableHead className="text-right">Usuários</TableHead>
                      <TableHead className="text-right">Média</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedData.schools.length > 0 ? (
                      processedData.schools.map((school, index) => (
                        <TableRow key={school.name}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{school.name}</TableCell>
                          <TableCell>{school.departamento_regional}</TableCell>
                          <TableCell className="text-right">{school.plan_count}</TableCell>
                          <TableCell className="text-right">{school.user_count}</TableCell>
                          <TableCell className="text-right font-bold">{school.avg}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={6} className="h-24 text-center">Nenhuma escola encontrada.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View for Schools */}
              <div className="md:hidden space-y-4 max-h-[400px] overflow-y-auto">
                {processedData.schools.length > 0 ? (
                  processedData.schools.map((school, index) => (
                    <div key={school.name} className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm border">
                      <div className="flex justify-between items-center font-medium">
                        <span className="text-lg text-primary">#{index + 1}</span>
                        <span>{school.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{school.departamento_regional}</div>
                      <div className="grid grid-cols-3 gap-2 py-2 border-t border-border/50">
                        <div className="text-center">
                          <span className="block text-xl font-bold">{school.plan_count}</span>
                          <span className="text-[10px] uppercase text-muted-foreground">Planos</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-xl font-bold">{school.user_count}</span>
                          <span className="text-[10px] uppercase text-muted-foreground">Usuários</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-xl font-bold">{school.avg}</span>
                          <span className="text-[10px] uppercase text-muted-foreground">Média</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Nenhuma escola encontrada.</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela de Docentes */}
        <Card>
          <CardHeader>
            <CardTitle>Ranking de Desempenho por Docente</CardTitle>
            <div className="mt-4 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Buscar por docente, escola ou departamento..." value={docenteSearch} onChange={(e) => setDocenteSearch(e.target.value)} className="pl-8 w-full" />
            </div>
          </CardHeader>
          <CardContent>
            {/* Desktop Table */}
            <div className="hidden md:block max-h-[300px] overflow-y-auto overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Docente</TableHead>
                    <TableHead>Escola</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-right">Planos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedData.docentes.length > 0 ? (
                    processedData.docentes.map((docente, index) => (
                      <TableRow key={`${docente.name}-${index}`}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{docente.name}</TableCell>
                        <TableCell>{docente.escola}</TableCell>
                        <TableCell>{docente.departamento_regional}</TableCell>
                        <TableCell className="text-right">{docente.plan_count}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center">Nenhum docente encontrado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View for Docentes */}
            <div className="md:hidden space-y-4 max-h-[400px] overflow-y-auto">
              {processedData.docentes.length > 0 ? (
                processedData.docentes.map((docente, index) => (
                  <div key={`${docente.name}-${index}`} className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm border">
                    <div className="flex justify-between items-center font-medium">
                      <span className="text-lg text-primary">#{index + 1}</span>
                      <span>{docente.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <span>{docente.escola}</span>
                      <span className="text-right">{docente.departamento_regional}</span>
                    </div>
                    <div className="py-2 border-t border-border/50 flex justify-between items-center">
                      <span className="text-[10px] uppercase text-muted-foreground">Planos Gerados</span>
                      <span className="text-xl font-bold">{docente.plan_count}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">Nenhum docente encontrado.</div>
              )}
            </div>
          </CardContent>        </Card>
      </div>
    </div>
  )
}