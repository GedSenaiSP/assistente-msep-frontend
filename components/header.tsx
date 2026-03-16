"use client"

import { Button } from "@/components/ui/button"
import { Menu, MoonIcon, SunIcon, X } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { useSidebar } from "@/components/ui/sidebar"
import Image from "next/image"
import { UserMenu } from "@/components/user-menu"
import { NotificationBell } from "@/components/notification-bell"

interface HeaderProps {
  activeView: string
  isMobile?: boolean
  createNewConversation?: () => void
  onPlanClick?: (planId: string) => void
}

export function Header({ activeView, isMobile, createNewConversation, onPlanClick }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { isOpen, setIsOpen } = useSidebar()

  // Necessário para evitar erro de hidratação
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="h-16 bg-gradient-to-r from-msep-blue to-msep-orange flex items-center justify-between px-2 sm:px-4 z-10">
      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="flex-shrink-0 text-white hover:bg-white/10"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        )}

        {/* Logo SENAI que muda com base no tema */}
        {mounted && (
          <div className="w-20 sm:w-32 flex-shrink-0">
            {theme === "dark" ? (
              <Image src="/senai-sp-logo.png" alt="SENAI SP Logo" width={124} height={32} priority className="w-full h-auto" />
            ) : (
              <Image src="/senai-sp-logo.png" alt="SENAI SP Logo" width={124} height={32} priority className="w-full h-auto" />
            )}
          </div>
        )}

        <div className="min-w-0 ml-2">
          <p className="text-xs sm:text-sm font-medium text-white break-words">
            Assistente Virtual da Metodologia SENAI de Educação Profissional
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {mounted && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full hover:bg-muted"
              aria-label="Alternar tema"
            >
              {theme === "dark" ? (
                <SunIcon className="h-5 w-5 text-yellow-500" />
              ) : (
                <MoonIcon className="h-5 w-5 text-msep-blue" />
              )}
            </Button>
            <NotificationBell onPlanClick={onPlanClick} />
          </>
        )}
        <UserMenu />
      </div>
    </header>
  )
}
