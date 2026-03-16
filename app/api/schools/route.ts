import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"

interface ObaSchool {
  id: number
  nome_unidade: string
  // Outros campos podem ser adicionados se necessário no futuro
}

export async function GET(req: NextRequest) {
  // Verificar autenticação
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const uf = searchParams.get("uf")

  if (!uf) {
    return NextResponse.json({ error: "UF (state) is required" }, { status: 400 })
  }

  const apiBaseUrl = process.env.OBA_API
  const clientId = process.env.WSO2_CLIENT_ID
  const clientSecret = process.env.WSO2_CLIENT_SECRET

  if (!apiBaseUrl || !clientId || !clientSecret) {
    console.error("Missing environment variables for school API")
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const headers = {
    Authorization: `Basic ${credentials}`,
  }

  const params = new URLSearchParams({
    uf: uf,
    pageSize: "1000",
    page: "1",
  })

  try {
    const response = await fetch(`${apiBaseUrl}?${params.toString()}`, { headers })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Error fetching schools from OBA API: ${response.status} ${response.statusText}`, errorText)
      return NextResponse.json({ error: "Failed to fetch schools", details: errorText }, { status: response.status })
    }

    const data: ObaSchool[] = await response.json()

    // Mapeia a resposta para um formato mais simples para o frontend
    const schools = data.map((school) => ({
      id: school.id,
      nome: school.nome_unidade,
    }))

    return NextResponse.json(schools)
  } catch (error) {
    console.error("Error calling school API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}