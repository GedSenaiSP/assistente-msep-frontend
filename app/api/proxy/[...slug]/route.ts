import { NextRequest, NextResponse } from "next/server";
import { Agent } from "undici";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

async function handler(req: NextRequest) {
  // 1. Bloquear acesso direto pelo navegador (Aba ou URL direta)
  const secFetchDest = req.headers.get("sec-fetch-dest");
  const acceptHeader = req.headers.get("accept") || "";

  if (secFetchDest === "document" || acceptHeader.includes("text/html")) {
    return NextResponse.json(
      { error: "Acesso direto à API não é permitido." },
      { status: 403 }
    );
  }

  // 2. Verificar autenticação geral
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json(
      { error: "Não autorizado. Faça login para acessar." },
      { status: 401 }
    );
  }

  const backendUrl = process.env.BACKEND_API_URL;
  const apiSecretToken = process.env.API_SECRET_TOKEN;

  if (!backendUrl || !apiSecretToken) {
    console.error("Variáveis de ambiente BACKEND_API_URL ou API_SECRET_TOKEN não estão definidas.");
    return NextResponse.json({ error: "Configuração do servidor incompleta." }, { status: 500 });
  }

  const requestUrl = new URL(req.url);
  const slug = requestUrl.pathname.replace("/api/proxy", "");
  const targetUrl = `${backendUrl}${slug}${requestUrl.search}`;

  // 3. Checagem de RBAC (Horizontal e Vertical Bypass)
  const adminOnlyRoutes = [
    "/users",
    "/metrics",
    "/user/set_department",
    "/plan/archive",
    "/plan/update_status"
  ];
  const isTargetingAdmin = adminOnlyRoutes.some(route => slug.startsWith(route));

  // Verificar manipulação Horizontal (se o body ou query string contem um userId diferente do logado)
  let requestBody = null;
  let bodyUserId = null;

  // Clone request to read body if present
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      const clonedReq = req.clone();
      requestBody = await clonedReq.json();
      bodyUserId = requestBody?.userId || requestBody?.user_id;
    } catch (e) {
      // Body couldn't be parsed as JSON, ignore
    }
  }

  const queryUserId = requestUrl.searchParams.get("user_id") || requestUrl.searchParams.get("userId");
  const urlUserIdParam = slug.match(/^\/user\/([a-zA-Z0-9-]+)/)?.[1]; // Extracts ID from /user/{id} when not /users

  const hasUserIdInPayload = bodyUserId || queryUserId || (urlUserIdParam && slug !== "/users");
  const targetedUserId = bodyUserId || queryUserId || urlUserIdParam;
  const isTargetingOtherUser = hasUserIdInPayload && targetedUserId !== session.user.id;

  // Se a rota for de admin OU ele estiver tentando acessar dados de outro usuário, checar a Role dele!
  if (isTargetingAdmin || isTargetingOtherUser) {
    try {
      // Busca a role "por debaixo dos panos" no backend usando o token de admin
      const roleRes = await fetch(`${backendUrl}/user/${session.user.id}/role`, {
        headers: { "Authorization": `Bearer ${apiSecretToken}` }
      });

      if (roleRes.ok) {
        const { role } = await roleRes.json();
        const isAdmin = role === "administracao_nacional" || role === "administracao_regional" || role === "coordenador";

        if (isTargetingAdmin && !isAdmin) {
          return NextResponse.json({ error: "Acesso negado: Rota de uso exclusivo da Administração." }, { status: 403 });
        }

        if (isTargetingOtherUser && !isAdmin) {
          return NextResponse.json({ error: "Acesso negado: Você não pode manipular dados de outras contas." }, { status: 403 });
        }
      } else {
        // Se falhou ao buscar a role, por segurança, bloqueia o acesso sensível
        return NextResponse.json({ error: "Falha ao validar permissões de acesso." }, { status: 403 });
      }
    } catch (error) {
      console.error("Erro na checagem de RBAC no Proxy:", error);
      return NextResponse.json({ error: "Erro interno de validação de permissões." }, { status: 500 });
    }
  }

  // 4. Clona os headers da requisição original
  const headers = new Headers(req.headers);
  headers.set("Authorization", `Bearer ${apiSecretToken}`);
  headers.delete("host");

  try {
    // Configura um agente customizado com timeout extendido
    const dispatcher = new Agent({
      bodyTimeout: 1200000,
      headersTimeout: 1200000,
      connectTimeout: 1200000,
    });

    const bodyToForward = requestBody ? JSON.stringify(requestBody) : req.body;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? bodyToForward : undefined,
      duplex: "half",
      redirect: "manual",
      cache: "no-store",
      // @ts-ignore
      dispatcher: dispatcher,
    });

    return response;

  } catch (error) {
    console.error("Erro ao fazer a requisição para o backend:", error);
    return NextResponse.json({ error: "Erro ao conectar com o serviço de backend." }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const HEAD = handler;
export const OPTIONS = handler;

export const maxDuration = 300;