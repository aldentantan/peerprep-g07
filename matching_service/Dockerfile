FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY . .

RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

EXPOSE 3002

CMD ["node", "dist/index.js"]
