import { type NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Define quais caminhos são considerados públicos (não requerem autenticação)
  const isPublicPath =
    path === "/" ||
    path === "/login" ||
    path.startsWith("/api/auth") ||
    path.includes("/_next") ||
    path.includes("/favicon.ico")

  // Verifica se o usuário está autenticado
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const isAuthenticated = !!token

  // Se for uma rota de API protegida e não estiver autenticado
  if ((path.startsWith("/api/proxy") || path.startsWith("/api/schools")) && !isAuthenticated) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  // Se o caminho for protegido (/app/*) e o usuário não estiver autenticado,
  // redireciona para a página de login
  if (path.startsWith("/app") && !isAuthenticated) {
    // Salva a URL original para redirecionar de volta após o login
    const url = new URL("/login", request.url)
    url.searchParams.set("callbackUrl", request.url)
    return NextResponse.redirect(url)
  }

  // Se o usuário estiver autenticado e tentar acessar uma página pública como /login,
  // redireciona para a página principal do app
  if (isAuthenticated && path === "/login") {
    return NextResponse.redirect(new URL("/app", request.url))
  }

  return NextResponse.next()
}

// Configuração para especificar em quais caminhos o middleware deve ser executado
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next (Next.js internals)
     * 2. /api/auth (NextAuth.js API routes)
     * 3. /favicon.ico, /sitemap.xml (static files)
     */
    "/((?!_next|api/auth|favicon.ico|sitemap.xml).*)",
  ],
}
