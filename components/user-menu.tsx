"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { signOut, useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"

export function UserMenu() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [userName, setUserName] = useState<string | null>(null)
  const [userImage, setUserImage] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user) {
      // Tentar obter o nome do usuário de várias propriedades possíveis
      const name =
        ((session.user.name ||
        session.user.given_name ||
        session.user.preferred_username ||
        session.user.email?.split("@")[0]) + " " + session.user.family_name) ||
        "Usuário"

      setUserName(name)

      // Tentar obter a imagem do usuário
      const image = session.user.image || session.user.picture || null

      setUserImage(image)

      // Log para depuração
      if (process.env.NEXT_PUBLIC_DEBUG_AUTH === "true") {
        console.log("Informações do usuário na sessão:", {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          picture: session.user.picture,
          given_name: session.user.given_name,
          family_name: session.user.family_name,
          preferred_username: session.user.preferred_username,
        })
      }
    }
  }, [session])

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    )
  }

  if (!session) return null

  const userInitials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "U"

  const handleSignOut = async () => {
    // Primeiro fazemos o signOut
    await signOut({ redirect: false })
    // Depois redirecionamos manualmente para a landing page
    router.push("/")
  }

  // Determinar a origem da autenticação
  const authProvider = session.provider === "wso2" ? "SENAI BR" : "Google"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={userImage || ""} alt={userName || "User"} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled className="text-sm font-medium">
          {userName || "Usuário"}
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          {session.user?.email || ""}
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          Conectado com {authProvider}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut}>Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
