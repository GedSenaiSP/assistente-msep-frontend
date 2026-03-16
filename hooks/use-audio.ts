"use client"

import { useState, useCallback } from "react"

export const useAudio = (url: string) => {
  // Garante que o Audio object só seja criado no lado do cliente
  const [audio] = useState(typeof Audio !== "undefined" ? new Audio(url) : undefined)

  const play = useCallback(() => {
    if (audio) {
      audio.play().catch((error) => console.error("Erro ao tocar o áudio:", error))
    }
  }, [audio])

  return play
}
