FROM node:18-alpine

# Instalar dependencias necesarias para ciertos módulos nativos (si aplicara)
# RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar archivos de dependencias primero para aprovechar caché de capas
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto
EXPOSE 3000

# Comando de inicio
CMD ["npm", "start"]
