"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Send, CheckCircle, RotateCcw } from "lucide-react"
import { type PlanStatusType } from "@/services/api"

interface StatusCommentDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (comment: string) => void
    newStatus: PlanStatusType
    isLoading?: boolean
}

const statusConfig = {
    submetido: {
        title: "Submeter para Aprovação",
        description: "Adicione um comentário (opcional) sobre a submissão deste plano.",
        icon: Send,
        iconColor: "text-blue-600",
        buttonText: "Submeter",
        buttonClass: "bg-blue-600 hover:bg-blue-700",
        commentRequired: false,
    },
    aprovado: {
        title: "Aprovar Plano",
        description: "Adicione um comentário (opcional) sobre a aprovação deste plano.",
        icon: CheckCircle,
        iconColor: "text-green-600",
        buttonText: "Aprovar",
        buttonClass: "bg-green-600 hover:bg-green-700",
        commentRequired: false,
    },
    retornado: {
        title: "Retornar para Revisão",
        description: "Por favor, adicione um feedback explicando os pontos que precisam ser revisados.",
        icon: RotateCcw,
        iconColor: "text-amber-600",
        buttonText: "Retornar",
        buttonClass: "bg-amber-500 hover:bg-amber-600",
        commentRequired: true,
    },
    gerado: {
        title: "Alterar Status",
        description: "Adicione um comentário (opcional).",
        icon: Send,
        iconColor: "text-gray-600",
        buttonText: "Confirmar",
        buttonClass: "bg-gray-600 hover:bg-gray-700",
        commentRequired: false,
    },
}

export function StatusCommentDialog({
    isOpen,
    onClose,
    onConfirm,
    newStatus,
    isLoading = false,
}: StatusCommentDialogProps) {
    const [comment, setComment] = useState("")

    const config = statusConfig[newStatus]
    const Icon = config.icon
    const isValid = !config.commentRequired || comment.trim().length > 0

    const handleConfirm = () => {
        onConfirm(comment.trim())
        setComment("")
    }

    const handleClose = () => {
        setComment("")
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${config.iconColor}`} />
                        {config.title}
                    </DialogTitle>
                    <DialogDescription>{config.description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="comment">
                            Comentário {config.commentRequired ? "(obrigatório)" : "(opcional)"}
                        </Label>
                        <Textarea
                            id="comment"
                            placeholder="Digite seu comentário ou feedback..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                            className="resize-none"
                        />
                    </div>
                    {config.commentRequired && comment.trim().length === 0 && (
                        <p className="text-sm text-amber-600">
                            É necessário informar um feedback ao retornar o plano para revisão.
                        </p>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!isValid || isLoading}
                        className={`text-white ${config.buttonClass}`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            <>
                                <Icon className="h-4 w-4 mr-2" />
                                {config.buttonText}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
