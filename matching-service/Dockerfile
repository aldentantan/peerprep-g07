FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install

# Copy the matching service code into the container
COPY . .

RUN npm run build

# Expose port number
EXPOSE 3002

CMD ["npm", "start"]
