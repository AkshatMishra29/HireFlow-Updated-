# ---------------------------------------------------
# Stage 1: Build the React + Vite application
# ---------------------------------------------------
FROM node:20-alpine AS build-stage

WORKDIR /app

# Copy package files first for efficient caching
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Copy the rest of the frontend source code
COPY . .

# Build static assets (outputs to /app/dist)
RUN npm run build

# ---------------------------------------------------
# Stage 2: Serve static files with Nginx
# ---------------------------------------------------
FROM nginx:alpine AS serve-stage

# Copy static build artifacts from build-stage to Nginx public html folder
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Custom nginx config to support React SPA HTML5 routing, API proxy, and HTTPS readiness
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $$uri $$uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://backend:8000/; \
        proxy_set_header Host $$host; \
        proxy_set_header X-Real-IP $$remote_addr; \
        proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $$scheme; \
        proxy_connect_timeout 300s; \
        proxy_send_timeout 300s; \
        proxy_read_timeout 300s; \
        client_max_body_size 50M; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose HTTP port 80 and HTTPS port 443
EXPOSE 80 443

# Start Nginx in foreground mode
CMD ["nginx", "-g", "daemon off;"]
