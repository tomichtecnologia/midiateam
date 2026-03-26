# Stage 1: Build
FROM node:18-slim AS build

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files from previous stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create certbot webroot directory
RUN mkdir -p /var/www/certbot/.well-known/acme-challenge

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
