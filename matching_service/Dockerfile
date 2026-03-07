FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install

# Copy the matching service code into the container
COPY . .

# Compile TypeScript to dist/
RUN npm run build

# Set port env variable of the docker container and expose it
ENV PORT=3002
EXPOSE 3002

CMD ["npm", "start"]