import type React from "react"
import { AppProvider } from "@/contexts/app-context"
import { ProcessingOverlay } from "@/components/ui/processing-overlay"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppProvider>
      {children}
      <ProcessingOverlay />
    </AppProvider>
  )
}
