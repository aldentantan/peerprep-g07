FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]