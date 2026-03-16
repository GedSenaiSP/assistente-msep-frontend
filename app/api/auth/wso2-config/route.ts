import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    name: "Senai",
    baseUrl: process.env.WSO2_BASE_URL_AUTH,
    // Apenas informações seguras para o cliente
  })
}
