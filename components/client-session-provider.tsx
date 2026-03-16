"use client"

import { SessionProvider, signOut, useSession } from "next-auth/react"
import type { ReactNode } from "react"
import { useEffect } from "react"

// Componente interno para verificar erro de sessão
function SessionErrorChecker({ children }: { children: ReactNode }) {
  const { data: session } = useSession()

  useEffect(() => {
    // Se houver erro de refresh token, força logout
    if (session?.error === "RefreshAccessTokenError") {
      console.log("Token expirado e não foi possível renovar. Redirecionando para login...")
      signOut({ callbackUrl: "/login" })
    }
  }, [session?.error])

  return <>{children}</>
}

export function ClientSessionProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <SessionErrorChecker>{children}</SessionErrorChecker>
    </SessionProvider>
  )
}
