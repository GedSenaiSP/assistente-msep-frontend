'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Label } from "./ui/label"

interface RoleSelectionDialogProps {
  isOpen: boolean
  onSave: (data: { role: User["role"]; department: string; school: string }) => void
}

interface School {
  id: number
  nome: string
}

// const roles: User["role"][] = ["docente", "coordenador", "administracao_regional", "administracao_nacional"]
const roles: User["role"][] = ["docente"]
const roleDisplayNames: Record<User["role"], string> = {
  docente: "Docente",
  // coordenador: "Coordenação",
  // administracao_regional: "Departamento Regional",
  // administracao_nacional: "Departamento Nacional",
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

export function RoleSelectionDialog({ isOpen, onSave }: RoleSelectionDialogProps) {
  const [selectedRole, setSelectedRole] = useState<User["role"] | "">("")
  const [regionalDepartment, setRegionalDepartment] = useState("")
  const [school, setSchool] = useState("")
  const [schools, setSchools] = useState<School[]>([])
  const [isFetchingSchools, setIsFetchingSchools] = useState(false)

  const handleDepartmentChange = async (department: string) => {
    setRegionalDepartment(department)
    setSchool("")
    setSchools([])

    if (department) {
      setIsFetchingSchools(true)
      try {
        const response = await fetch(`/api/schools?uf=${department}`)
        if (!response.ok) {
          throw new Error("Failed to fetch schools")
        }
        const data = await response.json()
        setSchools(data)
      } catch (error) {
        console.error("Erro ao buscar escolas:", error)
        toast({
          title: "Erro ao buscar escolas",
          description: "Não foi possível carregar a lista de escolas.",
          variant: "destructive",
        })
      } finally {
        setIsFetchingSchools(false)
      }
    }
  }

  const handleSave = () => {
    if (selectedRole && regionalDepartment && school) {
      onSave({ role: selectedRole, department: regionalDepartment, school })
    }
  }

  const canSave = selectedRole && regionalDepartment && school

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Complete seu Cadastro</DialogTitle>
          <DialogDescription>
            Para continuar, por favor, nos informe alguns dados. Esta informação é importante para personalizar sua experiência.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Sua Função</Label>
            <Select value={selectedRole} onValueChange={(value: User["role"]) => setSelectedRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Clique para selecionar uma função..." />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleDisplayNames[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Departamento Regional</Label>
            <Select value={regionalDepartment} onValueChange={handleDepartmentChange}>
              <SelectTrigger>
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
          </div>

          <div className="space-y-2">
            <Label>Escola</Label>
            <Select value={school} onValueChange={setSchool} disabled={!regionalDepartment || isFetchingSchools}>
              <SelectTrigger>
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
                    Nenhuma escola encontrada.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={!canSave}>
            Salvar e Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
