FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Add env variables
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

ARG VITE_YJS_WS_URL
ENV VITE_YJS_WS_URL=${VITE_YJS_WS_URL}

ARG VITE_CHAT_WS_URL
ENV VITE_CHAT_WS_URL=${VITE_CHAT_WS_URL}

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3038

CMD ["nginx", "-g", "daemon off;"]
