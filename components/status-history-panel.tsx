"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Clock, MessageSquare, User, History } from "lucide-react"
import { getPlanStatusHistory, type StatusHistoryEntry } from "@/services/api"

interface StatusHistoryPanelProps {
    planId: string
    refreshTrigger?: number // Increment to trigger refresh
}

const statusConfig: Record<string, { label: string; className: string }> = {
    gerado: { label: "Gerado", className: "bg-gray-100 text-gray-700 border-gray-300" },
    submetido: { label: "Aguardando Aprovação", className: "bg-blue-100 text-blue-700 border-blue-300" },
    retornado: { label: "Retornado para Revisão", className: "bg-amber-100 text-amber-700 border-amber-300" },
    aprovado: { label: "Aprovado", className: "bg-green-100 text-green-700 border-green-300" },
}

function formatDateTime(isoString: string | null): string {
    if (!isoString) return "Data não disponível"
    try {
        const date = new Date(isoString)
        return date.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    } catch {
        return "Data inválida"
    }
}

function StatusBadge({ status }: { status: string }) {
    const config = statusConfig[status] || statusConfig.gerado
    return (
        <Badge variant="outline" className={`${config.className} font-medium text-xs`}>
            {config.label}
        </Badge>
    )
}

export function StatusHistoryPanel({ planId, refreshTrigger }: StatusHistoryPanelProps) {
    const [history, setHistory] = useState<StatusHistoryEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadHistory = async () => {
            try {
                setLoading(true)
                setError(null)
                const response = await getPlanStatusHistory(planId)
                setHistory(response.history)
            } catch (err: any) {
                console.error("Erro ao carregar histórico:", err)
                setError(err.message || "Erro ao carregar histórico")
            } finally {
                setLoading(false)
            }
        }

        if (planId) {
            loadHistory()
        }
    }, [planId, refreshTrigger])

    if (loading) {
        return (
            <Card>
                <CardContent className="py-8 flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-red-500">
                    {error}
                </CardContent>
            </Card>
        )
    }

    if (history.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Histórico de Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground py-4">
                    Nenhuma alteração de status registrada.
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Histórico de Status
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                        {history.map((entry, index) => (
                            <div
                                key={entry.id}
                                className={`relative pl-6 pb-4 ${index < history.length - 1 ? "border-l-2 border-gray-200" : ""
                                    }`}
                            >
                                {/* Timeline dot */}
                                <div className="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-primary border-2 border-white shadow" />

                                <div className="space-y-2">
                                    {/* Status change */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {entry.previous_status && (
                                            <>
                                                <StatusBadge status={entry.previous_status} />
                                                <span className="text-muted-foreground">→</span>
                                            </>
                                        )}
                                        <StatusBadge status={entry.new_status} />
                                    </div>

                                    {/* Metadata */}
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatDateTime(entry.created_at)}
                                        </div>
                                        {entry.changed_by_name && (
                                            <div className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {entry.changed_by_name}
                                            </div>
                                        )}
                                    </div>

                                    {/* Comment */}
                                    {entry.comment && (
                                        <div className="bg-muted/50 rounded-md p-3 text-sm">
                                            <div className="flex items-start gap-2">
                                                <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                <p className="text-foreground">{entry.comment}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
