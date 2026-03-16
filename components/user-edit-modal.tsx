'use client'

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { User, upsertUser } from "@/services/api"
import { toast } from "@/hooks/use-toast"

const roles: User["role"][] = ["docente", "coordenador", "administracao_regional", "administracao_nacional"]
const roleDisplayNames: Record<User["role"], string> = {
    docente: "Docente",
    coordenador: "Coordenação",
    administracao_regional: "Administração Regional",
    administracao_nacional: "Administração Nacional",
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

interface UserEditModalProps {
    user: User | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (updatedUser: User) => void
}

export function UserEditModal({ user, open, onOpenChange, onSave }: UserEditModalProps) {
    // Form state
    const [fullName, setFullName] = useState("")
    const [email, setEmail] = useState("")
    const [department, setDepartment] = useState("")
    const [school, setSchool] = useState("")
    const [role, setRole] = useState<User["role"]>("docente")

    // Loading states
    const [isSaving, setIsSaving] = useState(false)
    const [isLoadingSchools, setIsLoadingSchools] = useState(false)
    const [schools, setSchools] = useState<School[]>([])

    // Reset form when user changes
    useEffect(() => {
        if (user) {
            setFullName(user.full_name || "")
            setEmail(user.email || "")
            setDepartment(user.departamento_regional || "")
            setSchool(user.escola || "")
            setRole(user.role)
        }
    }, [user])

    // Load schools when department changes
    const fetchSchools = useCallback(async (uf: string) => {
        if (!uf) {
            setSchools([])
            return
        }

        setIsLoadingSchools(true)
        try {
            const response = await fetch(`/api/schools?uf=${uf}`)
            if (!response.ok) {
                throw new Error("Erro ao buscar escolas")
            }
            const data: School[] = await response.json()
            setSchools(data)
        } catch (error) {
            console.error("Erro ao buscar escolas:", error)
            setSchools([])
        } finally {
            setIsLoadingSchools(false)
        }
    }, [])

    useEffect(() => {
        if (open && department) {
            fetchSchools(department)
        }
    }, [open, department, fetchSchools])

    const handleDepartmentChange = (newDepartment: string) => {
        setDepartment(newDepartment)
        setSchool("") // Clear school when department changes
        fetchSchools(newDepartment)
    }

    const handleSave = async () => {
        if (!user) return

        setIsSaving(true)
        try {
            await upsertUser({
                user_id: user.user_id,
                full_name: fullName,
                email: email,
                role: role,
                departamento_regional: department,
                escola: school,
            })

            const updatedUser: User = {
                ...user,
                full_name: fullName,
                email: email,
                role: role,
                departamento_regional: department,
                escola: school,
            }

            onSave(updatedUser)
            onOpenChange(false)

            toast({
                title: "Usuário atualizado!",
                description: `Os dados de ${fullName} foram salvos com sucesso.`,
            })
        } catch (error) {
            console.error("Erro ao salvar usuário:", error)
            toast({
                title: "Erro ao salvar",
                description: "Não foi possível salvar as alterações. Tente novamente.",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (!user) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Editar Usuário</DialogTitle>
                    <DialogDescription>
                        Altere os dados do usuário e clique em salvar.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Nome Completo */}
                    <div className="grid gap-2">
                        <Label htmlFor="fullName">Nome Completo</Label>
                        <Input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Nome do usuário"
                        />
                    </div>

                    {/* E-mail (somente leitura - gerenciado pelo SSO) */}
                    <div className="grid gap-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            disabled
                            className="bg-muted cursor-not-allowed"
                            placeholder="email@exemplo.com"
                        />
                        <p className="text-xs text-muted-foreground">
                            O e-mail é gerenciado pelo sistema de autenticação (SSO).
                        </p>
                    </div>

                    {/* Departamento Regional */}
                    <div className="grid gap-2">
                        <Label htmlFor="department">Departamento Regional</Label>
                        <Select value={department} onValueChange={handleDepartmentChange}>
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

                    {/* Escola */}
                    <div className="grid gap-2">
                        <Label htmlFor="school">Escola</Label>
                        <Select
                            value={school}
                            onValueChange={setSchool}
                            disabled={!department || isLoadingSchools}
                        >
                            <SelectTrigger>
                                <SelectValue
                                    placeholder={
                                        isLoadingSchools
                                            ? "Carregando escolas..."
                                            : !department
                                                ? "Selecione um departamento primeiro"
                                                : "Selecione a escola"
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {schools.length > 0 ? (
                                    schools.map((s) => (
                                        <SelectItem key={s.id} value={s.nome}>
                                            {s.nome}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                        Nenhuma escola encontrada
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Função */}
                    <div className="grid gap-2">
                        <Label htmlFor="role">Função</Label>
                        <Select value={role} onValueChange={(value: User["role"]) => setRole(value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a função" />
                            </SelectTrigger>
                            <SelectContent>
                                {roles.map((r) => (
                                    <SelectItem key={r} value={r}>
                                        {roleDisplayNames[r]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            "Salvar"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
