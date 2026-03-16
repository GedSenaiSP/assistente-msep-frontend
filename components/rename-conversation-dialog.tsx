"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApp } from "@/contexts/app-context"
import { Loader2 } from "lucide-react"

export function RenameConversationDialog() {
  const {
    conversations: {
      isRenameDialogOpen,
      setIsRenameDialogOpen,
      newConversationTitle,
      setNewConversationTitle,
      renameConversation,
      isProcessing,
    },
  } = useApp()

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault()
    await renameConversation()
  }

  return (
    <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleRename}>
          <DialogHeader>
            <DialogTitle>Renomear Conversa</DialogTitle>
            <DialogDescription>Digite um novo nome para esta conversa.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="sm:text-right">
                Título
              </Label>
              <Input
                id="name"
                value={newConversationTitle}
                onChange={(e) => setNewConversationTitle(e.target.value)}
                className="col-span-1 sm:col-span-3"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsRenameDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
