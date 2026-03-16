import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import type { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    {
      id: "wso2",
      name: "Senai",
      type: "oauth",
      clientSecret: process.env.WSO2_CLIENT_SECRET!,
      clientId: process.env.WSO2_CLIENT_ID!,
      wellKnown: `${process.env.WSO2_BASE_URL_AUTH}/oauth2/token/.well-known/openid-configuration`,
      authorization: {
        params: { scope: "openid profile email phone address roles" },
      },
      // Implementação personalizada para buscar informações do usuário
      userinfo: {
        url: `${process.env.WSO2_BASE_URL_AUTH}/oauth2/userinfo`,
        async request({ tokens }) {
          if (process.env.DEBUG_AUTH === "true") {
            console.log("Buscando informações do usuário no endpoint userinfo")
          }
          try {
            const response = await fetch(`${process.env.WSO2_BASE_URL_AUTH}/oauth2/userinfo`, {
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
              },
            })

            if (!response.ok) {
              if (process.env.DEBUG_AUTH === "true") {
                console.error("Erro ao buscar informações do usuário:", response.status, response.statusText)
                const errorText = await response.text()
                console.error("Resposta de erro:", errorText)
              }
              return {}
            }

            const userInfo = await response.json()
            if (process.env.DEBUG_AUTH === "true") {
              console.log("Informações do usuário obtidas:", userInfo)
            }
            return userInfo
          } catch (error) {
            if (process.env.DEBUG_AUTH === "true") {
              console.error("Erro ao buscar informações do usuário:", error)
            }
            return {}
          }
        },
      },
      profile(profile, tokens) {
        if (process.env.DEBUG_AUTH === "true") {
          console.log("Processando perfil do WSO2:", profile)
        }

        // Se não tivermos informações suficientes, vamos tentar decodificar o ID token
        if (!profile.name && tokens.id_token) {
          try {
            // Decodificar o ID token (que está em formato JWT)
            const idTokenParts = tokens.id_token.split(".")
            if (idTokenParts.length === 3) {
              const idTokenPayload = JSON.parse(Buffer.from(idTokenParts[1], "base64").toString())
              if (process.env.DEBUG_AUTH === "true") {
                console.log("Payload do ID token:", idTokenPayload)
              }

              // Mesclar as informações do ID token com o perfil
              profile = { ...profile, ...idTokenPayload }
            }
          } catch (error) {
            if (process.env.DEBUG_AUTH === "true") {
              console.error("Erro ao decodificar ID token:", error)
            }
          }
        }

        return {
          id: profile.sub,
          name: profile.given_name || profile.name || profile.preferred_username || "Usuário",
          email: profile.email || `${profile.sub}@example.com`,
          image: profile.picture || null,
          // Adicionar todas as informações do perfil para uso posterior
          ...profile,
        }
      },
      httpOptions: {
        timeout: 60000, // Aumentar timeout para 60 segundos
      },
    },
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (process.env.DEBUG_AUTH === "true") {
        console.log("JWT Callback - User:", user ? { id: user.id, name: user.name, email: user.email } : "undefined")
      }

      // Login inicial - armazena os tokens
      if (account) {
        if (process.env.DEBUG_AUTH === "true") {
          console.log("JWT Callback - Account:", {
            provider: account.provider,
            type: account.type,
            hasAccessToken: !!account.access_token,
            hasIdToken: !!account.id_token,
            expiresAt: account.expires_at,
          })
        }

        token.accessToken = account.access_token
        token.idToken = account.id_token
        token.refreshToken = account.refresh_token
        token.provider = account.provider
        // Armazena o timestamp de expiração
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000
      }

      if (user) {
        token.user = user
      }

      // Verifica se o token WSO2 expirou
      if (token.provider === "wso2" && token.accessTokenExpires) {
        const now = Date.now()
        const shouldRefresh = now > (token.accessTokenExpires as number) - 60000 // Renova 1 minuto antes de expirar

        if (shouldRefresh && token.refreshToken) {
          if (process.env.DEBUG_AUTH === "true") {
            console.log("Token WSO2 expirado ou prestes a expirar, tentando renovar...")
          }

          try {
            const response = await fetch(`${process.env.WSO2_BASE_URL_AUTH}/oauth2/token`, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${Buffer.from(
                  `${process.env.WSO2_CLIENT_ID}:${process.env.WSO2_CLIENT_SECRET}`
                ).toString("base64")}`,
              },
              body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: token.refreshToken as string,
              }),
            })

            if (response.ok) {
              const refreshedTokens = await response.json()

              if (process.env.DEBUG_AUTH === "true") {
                console.log("Token WSO2 renovado com sucesso")
              }

              token.accessToken = refreshedTokens.access_token
              token.idToken = refreshedTokens.id_token ?? token.idToken
              token.refreshToken = refreshedTokens.refresh_token ?? token.refreshToken
              token.accessTokenExpires = Date.now() + (refreshedTokens.expires_in ?? 3600) * 1000
            } else {
              if (process.env.DEBUG_AUTH === "true") {
                console.error("Erro ao renovar token WSO2:", response.status, await response.text())
              }
              // Se não conseguir renovar, marca o token como expirado para forçar novo login
              token.error = "RefreshAccessTokenError"
            }
          } catch (error) {
            if (process.env.DEBUG_AUTH === "true") {
              console.error("Erro ao renovar token WSO2:", error)
            }
            token.error = "RefreshAccessTokenError"
          }
        } else if (shouldRefresh && !token.refreshToken) {
          // Sem refresh token, marca como erro para forçar novo login
          if (process.env.DEBUG_AUTH === "true") {
            console.log("Token WSO2 expirado e sem refresh token disponível")
          }
          token.error = "RefreshAccessTokenError"
        }
      }

      return token
    },
    async session({ session, token }) {
      if (process.env.DEBUG_AUTH === "true") {
        console.log(
          "Session Callback - Token user:",
          token.user
            ? {
              id: token.user.id,
              name: token.user.name,
              email: token.user.email,
            }
            : "undefined",
        )
      }

      // Se houver erro de refresh, propaga para o cliente para forçar novo login
      if (token.error) {
        session.error = token.error as string
      }

      // Adiciona os tokens de acesso à sessão
      session.accessToken = token.accessToken as string
      session.idToken = token.idToken as string
      session.provider = token.provider as string

      // Adiciona as informações do usuário à sessão
      if (token.user) {
        session.user = token.user as any
      }

      // Garante que o ID do usuário esteja definido
      if (session.user && token.sub) {
        session.user.id = token.sub
      }

      return session
    },
    async redirect({ url, baseUrl }) {
      // Simplificando a lógica de redirecionamento
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`
      } else if (url.startsWith(baseUrl)) {
        return url
      }
      return `${baseUrl}/app`
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.DEBUG_AUTH === "true",
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
