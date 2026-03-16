import "next-auth"

export interface User {
  amr?: string[]
  at_hash?: string
  aud?: string
  azp?: string
  c_hash?: string
  email?: string
  email_verified?: boolean
  exp?: number
  family_name?: string
  given_name?: string
  google_email?: string
  groups?: string[]
  iat?: number
  id?: string
  isk?: string
  iss?: string
  jti?: string
  mobile?: string
  name?: string
  nbf?: number
  picture?: string
  roles?: string[]
  sid?: string
  sub?: string
  updated_at?: number
  user_id?: string
  // Campos adicionais que podem estar presentes
  preferred_username?: string
  [key: string]: any // Para permitir campos adicionais
}

declare module "next-auth" {
  interface Session {
    accessToken?: string
    idToken?: string
    provider?: string
    user?: User
    error?: string  // Erro de refresh token
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    idToken?: string
    refreshToken?: string  // Refresh token do WSO2
    accessTokenExpires?: number  // Timestamp de expiração
    provider?: string
    user?: User
    token?: string
    error?: string
    iat?: number
    exp?: number
  }
}
