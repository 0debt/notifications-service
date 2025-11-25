# Usamos la base oficial de Bun
FROM oven/bun:1

# Creamos la carpeta de trabajo
WORKDIR /app

# Copiamos los archivos de dependencias primero (para ir más rápido)
COPY package.json bun.lockb ./

# Instalamos las dependencias (solo las necesarias para producción)
RUN bun install --production

# Copiamos todo el resto de tu código
COPY . .

# Abrimos el puerto 3000 (el de Hono)
EXPOSE 3000

# Comando para arrancar el servidor
CMD ["bun", "run", "start"]