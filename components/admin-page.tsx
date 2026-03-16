"use client"

import { useApp } from "@/contexts/app-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserManagementTable } from "@/components/user-management-table"
import { MetricsDashboard } from "@/components/metrics-dashboard"
import { Skeleton } from "./ui/skeleton"

export function AdminPage() {
  const { userRole } = useApp()

  // Define o valor padrão da aba com base na role.
  const defaultValue = userRole === "administracao_regional" || userRole === "administracao_nacional" ? "users" : "metrics"

  // Enquanto a role do usuário ainda não foi carregada, exibe um skeleton.
  if (!userRole) {
    return (
      <div className="flex flex-col h-full p-6">
        <Skeleton className="h-10 w-1/3 mb-4" />
        <div className="flex gap-2 mb-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="flex-1 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 sm:p-4 bg-msep-blue/5 border-b flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-medium text-primary">
            Administração
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {userRole === "coordenador"
              ? "Acesse as métricas de desempenho da sua escola."
              : "Gerencie usuários e outras configurações da plataforma."}
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue={defaultValue} className="h-full flex flex-col">
          <TabsList className="justify-start">
            {(userRole === "administracao_regional" || userRole === "administracao_nacional") && (
              <TabsTrigger value="users">Gerenciar Usuários</TabsTrigger>
            )}
            {(userRole === "administracao_regional" || userRole === "administracao_nacional" || userRole === "coordenador") && (
              <TabsTrigger value="metrics">Métricas</TabsTrigger>
            )}
          </TabsList>
          <div className="flex-1 mt-4">
            {(userRole === "administracao_regional" || userRole === "administracao_nacional") && (
              <TabsContent value="users" className="h-full">
                <UserManagementTable />
              </TabsContent>
            )}
            {(userRole === "administracao_regional" || userRole === "administracao_nacional" || userRole === "coordenador") && (
              <TabsContent value="metrics" className="h-full">
                <MetricsDashboard />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  )
}