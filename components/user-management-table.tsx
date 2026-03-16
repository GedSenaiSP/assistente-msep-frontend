'use client'

import { useEffect, useState } from "react"
import { useApp } from "@/contexts/app-context"
import { getUsers, User } from "@/services/api"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { Loader2, Search, Pencil } from "lucide-react"
import { UserEditModal } from "./user-edit-modal"

const roleDisplayNames: Record<User["role"], string> = {
  docente: "Docente",
  coordenador: "Coordenação",
  administracao_regional: "Administração Regional",
  administracao_nacional: "Administração Nacional",
}

const stateDisplayNames: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
}

export function UserManagementTable() {
  const { userRole, userSchool } = useApp()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Estado para modal de edição
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  useEffect(() => {
    async function fetchUsers() {
      try {
        setIsLoading(true)
        const response = await getUsers()
        let fetchedUsers = response.users || []

        setUsers(fetchedUsers)
        setFilteredUsers(fetchedUsers)
      } catch (error) {
        toast({
          title: "Erro ao carregar usuários",
          description: "Não foi possível buscar a lista de usuários. Tente novamente mais tarde.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    if (userRole) {
      fetchUsers()
    }
  }, [userRole, userSchool])

  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase()
    const filtered = users.filter(
      (user) =>
        user.full_name?.toLowerCase().includes(lowercasedQuery) ||
        user.email?.toLowerCase().includes(lowercasedQuery) ||
        user.departamento_regional?.toLowerCase().includes(lowercasedQuery) ||
        user.escola?.toLowerCase().includes(lowercasedQuery)
    )
    setFilteredUsers(filtered)
  }, [searchQuery, users])

  const handleEditClick = (user: User) => {
    setSelectedUser(user)
    setIsEditModalOpen(true)
  }

  const handleUserSaved = (updatedUser: User) => {
    setUsers((prev) =>
      prev.map((u) => (u.user_id === updatedUser.user_id ? updatedUser : u))
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Carregando usuários...</span>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por nome, e-mail, departamento regional ou escola..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 w-full max-w-md"
        />
      </div>
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome Completo</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Departamento Regional</TableHead>
              <TableHead>Escola</TableHead>
              <TableHead>Função</TableHead>
              <TableHead className="w-[60px] text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.departamento_regional
                      ? stateDisplayNames[user.departamento_regional] || user.departamento_regional
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {user.escola || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{roleDisplayNames[user.role]}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(user)}
                      title="Editar usuário"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {searchQuery ? "Nenhum usuário encontrado." : "Nenhum usuário cadastrado."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div key={user.user_id} className="bg-card rounded-lg border shadow-sm p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-base">{user.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditClick(user)}
                  className="-mt-1 -mr-2"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs block">Função</span>
                  <span className="font-medium">{roleDisplayNames[user.role]}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Departamento</span>
                  <span>{user.departamento_regional ? stateDisplayNames[user.departamento_regional] || user.departamento_regional : "—"}</span>
                </div>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground text-xs block">Escola</span>
                <span>{user.escola || "—"}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? "Nenhum usuário encontrado." : "Nenhum usuário cadastrado."}
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      <UserEditModal
        user={selectedUser}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSave={handleUserSaved}
      />
    </div>
  )
}

