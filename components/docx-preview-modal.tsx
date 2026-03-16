"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Loader2, Maximize2, Minimize2, FileDown, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DocxPreviewModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    previewUrl: string
    downloadUrl?: string
    fileType?: "docx" | "pptx"
}

export function DocxPreviewModal({
    isOpen,
    onClose,
    title,
    previewUrl,
    downloadUrl,
    fileType = "docx"
}: DocxPreviewModalProps) {
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [retryCount, setRetryCount] = useState(0)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    useEffect(() => {
        if (!isOpen) {
            setIsLoading(true)
            setError(null)
            return
        }

        // Simular um pequeno delay para mostrar loading
        const timer = setTimeout(() => {
            setIsLoading(false)
        }, 1500)

        return () => clearTimeout(timer)
    }, [isOpen, retryCount])

    const handleRetry = () => {
        setIsLoading(true)
        setError(null)
        setRetryCount(prev => prev + 1)
    }

    const handleDownload = () => {
        if (downloadUrl) {
            window.open(downloadUrl, "_blank")
        }
    }

    const handleDownloadPdf = () => {
        // Abrir o PDF diretamente (já é gerado pela URL de preview)
        window.open(previewUrl, "_blank")
    }

    if (!isOpen || !mounted) return null

    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ pointerEvents: 'auto' }}
        >
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={(e) => {
                    e.stopPropagation()
                    onClose()
                }}
            />

            {/* Modal */}
            <div
                className={`relative bg-white rounded-lg shadow-2xl flex flex-col transition-all duration-300 ${isFullscreen
                    ? "w-full h-full m-0 rounded-none"
                    : "w-[95vw] h-[90vh] max-w-6xl"
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                    <h2 className="text-lg font-semibold text-[#e30613] truncate max-w-[60%]">
                        {title}
                    </h2>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadPdf}
                            className="text-[#e30613] border-[#e30613]/30 hover:bg-[#e30613] hover:text-white transition-colors"
                        >
                            <FileDown className="h-4 w-4 mr-2" />
                            Baixar PDF
                        </Button>
                        {downloadUrl && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                                className="text-[#681413] border-[#681413]/30 hover:bg-[#681413] hover:text-white transition-colors"
                            >
                                <FileDown className="h-4 w-4 mr-2" />
                                Baixar {fileType.toUpperCase()}
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="text-gray-600 hover:text-[#e30613]"
                        >
                            {isFullscreen ? (
                                <Minimize2 className="h-5 w-5" />
                            ) : (
                                <Maximize2 className="h-5 w-5" />
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="text-gray-600 hover:text-red-600"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden bg-gray-200">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Loader2 className="h-10 w-10 animate-spin text-[#e30613]" />
                            <p className="mt-4 text-[#e30613]/70">Gerando visualização PDF...</p>
                            <p className="mt-2 text-sm text-gray-500">Isso pode levar alguns segundos na primeira vez</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col items-center justify-center h-full">
                            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                            <p className="text-red-600 mb-4 text-center max-w-md">{error}</p>
                            <div className="flex gap-3">
                                <Button onClick={handleRetry} variant="outline" className="gap-2">
                                    <RefreshCw className="h-4 w-4" />
                                    Tentar novamente
                                </Button>
                                <Button onClick={onClose} variant="outline">
                                    Fechar
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* PDF Viewer usando iframe nativo */}
                    {!isLoading && !error && previewUrl && (
                        <iframe
                            src={previewUrl}
                            className="w-full h-full border-0"
                            title={`Preview: ${title}`}
                            onError={() => setError("Erro ao carregar o documento.")}
                        />
                    )}
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}
