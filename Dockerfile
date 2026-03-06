FROM node:22-alpine

# Instala ffmpeg e dependências do sistema
RUN apk add --no-cache ffmpeg libc6-compat

# Ativa corepack (gerenciador de versão do pnpm nativo do Node)
RUN corepack enable

WORKDIR /app

# Copia arquivos de dependências
COPY package.json pnpm-lock.yaml ./

# Instala pnpm e dependências
RUN corepack prepare pnpm@10.30.3 --activate && pnpm install --frozen-lockfile

# Copia o restante do código
COPY . .

# Build do Next.js
RUN pnpm build

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node_modules/.bin/next", "start"]
