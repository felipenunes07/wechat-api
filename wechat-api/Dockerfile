FROM node:18-alpine

# Cria diretório de trabalho
WORKDIR /usr/src/app

# Instala dependências
COPY package*.json ./
RUN npm install

# Copia o código fonte
COPY . .

# Expõe a porta que o Express vai usar
EXPOSE 3000

# Comando para iniciar
CMD [ "npm", "start" ]
