# Usamos la imagen oficial de Bun
FROM oven/bun:1 as base

WORKDIR /app

# 1. Copiamos los archivos de definición (Incluimos bun.lockb)
COPY package.json bun.lock ./

# 2. Instalamos dependencias EXACTAS (--frozen-lockfile)
RUN bun install --frozen-lockfile --production

# 3. Copiamos el código fuente
COPY . .

# 4. Exponemos el puerto
EXPOSE 3000

# 5. Comando de arranque
CMD ["bun", "run", "start"]