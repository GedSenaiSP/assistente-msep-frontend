"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { signIn, useSession } from "next-auth/react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

export default function LoginPage() {
  const router = useRouter()
  const { status } = useSession()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams?.get("callbackUrl") || "/app"
  const error = searchParams?.get("error")
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isSenaiLoading, setIsSenaiLoading] = useState(false)

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/app")
    }
  }, [status, router])

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true)
      await signIn("google", {
        callbackUrl: "/app",
        redirect: true,
      })
    } catch (error) {
      console.error("Login error:", error)
      setIsGoogleLoading(false)
    }
  }

  const handleSenaiLogin = async () => {
    try {
      setIsSenaiLoading(true)
      // Usando parâmetros simplificados para o WSO2
      await signIn("wso2", {
        callbackUrl: "/app",
        redirect: true,
      })
    } catch (error) {
      console.error("Login error:", error)
      setIsSenaiLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="flex justify-center mb-4">
            <Image src="/logo-light.svg" alt="SENAI Logo" width={180} height={180} />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Assistente Virtual da MSEP</CardTitle>
          <CardDescription className="text-center">Faça login para acessar o assistente virtual</CardDescription>

          {error && (
            <div className="mt-2 p-2 bg-red-50 text-red-600 text-sm rounded-md">
              Erro ao fazer login. Por favor, tente novamente.
            </div>
          )}
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {/* <Button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2"
            variant="outline"
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-black"></div>
                <span>Processando...</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path
                      fill="#4285F4"
                      d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
                    />
                    <path
                      fill="#34A853"
                      d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
                    />
                  </g>
                </svg>
                <span>Entrar com Google</span>
              </>
            )}
          </Button> */}

          <Button
            onClick={handleSenaiLogin}
            className="w-full flex items-center justify-center gap-2"
            variant="outline"
            disabled={isSenaiLoading}
          >
            {isSenaiLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-black"></div>
                <span>Processando...</span>
              </>
            ) : (
              <>
                <Image src="/logo-light.svg" alt="SENAI Logo" width={24} height={24} className="h-6 w-6" />
                <span>Entrar com SENAI BR</span>
              </>
            )}
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-500">
            Ao fazer login, você concorda com os termos de serviço e política de privacidade.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
