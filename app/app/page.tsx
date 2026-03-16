import { MsepAssistant } from "@/components/msep-assistant"
import { requireAuth } from "@/lib/auth"

export default async function AppPage() {
  // Verifica autenticação no lado do servidor
  await requireAuth()

  return (
    <main className="h-screen bg-background">
      <MsepAssistant />
    </main>
  )
}
