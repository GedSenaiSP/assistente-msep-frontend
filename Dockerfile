# Estágio de build
FROM node:22-alpine AS builder

WORKDIR /src

# Copiar arquivos de dependências
COPY package.json package-lock.json ./

RUN npm install -g npm@latest

# Instalar dependências
RUN npm install --force

RUN npm upgrade --force

# Copiar código fonte
COPY . .

# Construir a aplicação
RUN npm run build

# Estágio de produção
FROM node:22-alpine AS runner

WORKDIR /src

# Definir como ambiente de produção
ENV NODE_ENV=production

# Copiar dependências e arquivos de build do estágio anterior
COPY --from=builder /src/node_modules ./node_modules
COPY --from=builder /src/.next ./.next
COPY --from=builder /src/public ./public
COPY --from=builder /src/package.json ./package.json
COPY --from=builder /src/next.config.mjs ./next.config.mjs

RUN rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm \
    && rm -f /usr/local/bin/npx

# Configurar usuário não-root para melhor segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN chown -R nextjs:nodejs /src
USER nextjs

# Expor a porta que o Next.js utiliza
EXPOSE 3000

# Iniciar a aplicação
CMD ["node_modules/.bin/next", "start"]
