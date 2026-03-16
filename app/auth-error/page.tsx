"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams?.get("error")
  const router = useRouter()
  const [errorDetails, setErrorDetails] = useState<any>(null)

  useEffect(() => {
    // Tenta decodificar o erro se estiver em formato JSON
    if (error) {
      try {
        const decodedError = JSON.parse(decodeURIComponent(error))
        setErrorDetails(decodedError)
      } catch (e) {
        setErrorDetails({ message: error })
      }
    }
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-red-600">Erro de Autenticação</CardTitle>
          <CardDescription className="text-center">Ocorreu um erro durante o processo de autenticação.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 rounded-md">
            <h3 className="font-medium text-red-800">Detalhes do erro:</h3>
            <p className="mt-1 text-sm text-red-700">{errorDetails?.message || "Erro desconhecido"}</p>

            {errorDetails && (
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(errorDetails, null, 2)}
              </pre>
            )}
          </div>

          <div className="text-sm text-gray-600">
            <p>Possíveis causas:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Configuração incorreta do provedor de autenticação</li>
              <li>Problemas de conectividade com o servidor de autenticação</li>
              <li>Permissões insuficientes ou escopos não autorizados</li>
              <li>Sessão expirada ou inválida</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => router.push("/login")} className="w-full">
            Voltar para a página de login
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
