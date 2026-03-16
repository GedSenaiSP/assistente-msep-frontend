'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface ReviewInstructionDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (instruction: string) => void
}

export function ReviewInstructionDialog({ isOpen, onClose, onConfirm }: ReviewInstructionDialogProps) {
  const [instruction, setInstruction] = useState("")

  const handleConfirm = () => {
    onConfirm(instruction)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Revisar Desafio com IA</DialogTitle>
          <DialogDescription>
            Digite abaixo uma instrução para a IA revisar, melhorar ou complementar o texto do desafio que você já escreveu.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="instruction-text">Instrução para a IA:</Label>
          <Textarea
            id="instruction-text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Ex: Torne o texto mais formal, adicione um exemplo prático, ou transforme em uma história..."
            className="min-h-[100px]"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!instruction.trim()}>
            Enviar para a IA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
