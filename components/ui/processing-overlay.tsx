"use client"

import { useApp } from "@/contexts/app-context"
import { Loader2 } from "lucide-react"

export function ProcessingOverlay() {
  const { isProcessing, processingMessage } = useApp()

  if (!isProcessing) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center justify-center rounded-lg bg-background p-8 shadow-2xl">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
        <p className="text-lg font-medium text-foreground">{processingMessage || "Processando..."}</p>
        <p className="text-sm text-muted-foreground mt-2">Por favor, aguarde. Isso pode levar alguns instantes.</p>
      </div>
    </div>
  )
}
