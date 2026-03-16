"use client"
import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Cpu, Save } from "lucide-react"
import { configureModel } from "@/services/api"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"

interface ModelSettingsPanelProps {
  model: string
  setModel: (model: string) => void
  temperature: number
  setTemperature: (value: number) => void
  topP: number
  setTopP: (value: number) => void
}

export function ModelSettingsPanel({
  model,
  setModel,
  temperature,
  setTemperature,
  topP,
  setTopP,
}: ModelSettingsPanelProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [initialTemperature, setInitialTemperature] = useState(temperature)
  const [initialTopP, setInitialTopP] = useState(topP)
  const [isSaving, setIsSaving] = useState(false)

  // Verifica se houve mudanças nas configurações
  const hasChanges = temperature !== initialTemperature || topP !== initialTopP

  // Atualiza os valores iniciais quando as props mudam
  useEffect(() => {
    setInitialTemperature(temperature)
    setInitialTopP(topP)
  }, [])

  const models = [
    { id: "gemini-2.0-flash-001", name: "gemini-2.0-flash-001" },
    { id: "gemini-2.0-flash-lite-001", name: "gemini-2.0-flash-lite-001" },
    { id: "gemini-2.5-flash-preview-04-17", name: "gemini-2.5-flash-preview-04-17" },
  ]

  // Função para salvar as configurações - USANDO O SERVIÇO
  const handleSaveConfig = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para salvar as configurações.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const userId = session.user.id
      console.log("Salvando configurações do modelo:", {
        user_id: userId,
        temperature,
        top_p: topP,
      })

      // USANDO O SERVIÇO EM VEZ DE CHAMADA DIRETA
      const response = await configureModel(userId, temperature, topP)

      // Atualiza os valores iniciais após salvar com sucesso
      setInitialTemperature(temperature)
      setInitialTopP(topP)

      toast({
        title: "Configurações salvas",
        description: "As configurações do modelo foram salvas com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao salvar configurações:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar as configurações. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-primary/5 border-b">
        <h2 className="text-lg font-medium text-primary">Configurações do Modelo</h2>
        <p className="text-sm text-muted-foreground">
          Ajuste os parâmetros do modelo de IA para personalizar a geração de conteúdo
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap">
            <CardTitle className="flex items-center">
              <Cpu className="h-5 w-5 mr-2 text-primary" />
              Parâmetros do Modelo
            </CardTitle>
            <Button onClick={handleSaveConfig} disabled={!hasChanges || isSaving} size="sm" className="ml-auto">
              {isSaving ? "Salvando..." : "Salvar"}
              <Save className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {/* <Label htmlFor="model">Modelo LLM</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="Selecione um modelo" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select> */}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label htmlFor="temperature">Criatividade: {temperature.toFixed(2)}</Label>
              </div>
              <Slider
                id="temperature"
                min={0}
                max={2}
                step={0.05}
                value={[temperature]}
                onValueChange={(value) => setTemperature(value[0])}
                className="[&>[role=slider]]:bg-msep-blue [&>span]:bg-msep-orange/20"
              />
              <p className="text-xs text-muted-foreground">
                Em valores baixos, as respostas são mais diretas e focadas, como um aluno seguindo o roteiro. Em valores altos, as respostas se tornam mais criativas e inesperadas, como uma sessão de brainstorming.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label htmlFor="top-p">Vocabulário: {topP.toFixed(2)}</Label>
              </div>
              <Slider
                id="top-p"
                min={0}
                max={1}
                step={0.05}
                value={[topP]}
                onValueChange={(value) => setTopP(value[0])}
                className="[&>[role=slider]]:bg-msep-blue [&>span]:bg-msep-orange/20"
              />
              <p className="text-xs text-muted-foreground">
                Em valores baixos, o modelo usa apenas as palavras mais comuns e seguras. Em valores altos, ele se arrisca a usar um vocabulário mais amplo e diversificado, como convidar toda a turma para dar sua opinião.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
