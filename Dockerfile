# Stage 1: Build static assets with Node
FROM node:24.12.0-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source files and build the application
COPY . .
RUN npm run build

# Stage 2: Final - Nginx as base
FROM nginx:1.28-alpine

# Install supervisord, curl and envsubst for template rendering
RUN apk add --no-cache supervisor curl gettext

# Download OpenFGA binary and extract
ADD https://github.com/openfga/openfga/releases/download/v1.11.2/openfga_1.11.2_linux_amd64.tar.gz /tmp/openfga.tar.gz
RUN tar -xzf /tmp/openfga.tar.gz -C / && rm /tmp/openfga.tar.gz && chmod +x /openfga

# Download grpc_health_probe
ADD https://github.com/grpc-ecosystem/grpc-health-probe/releases/download/v0.4.42/grpc_health_probe-linux-amd64 /usr/local/bin/grpc_health_probe
RUN chmod +x /usr/local/bin/grpc_health_probe

# Copy configurations and static files
COPY --from=builder /app/dist /public
COPY templates/nginx.conf.template /etc/nginx/nginx.conf.template
COPY templates/config.json.template /etc/templates/config.json.template
COPY bin/setup.sh /usr/local/bin/setup.sh
COPY bin/start-openfga.sh /usr/local/bin/start-openfga.sh
RUN chmod +x /usr/local/bin/setup.sh /usr/local/bin/start-openfga.sh
COPY supervisord.conf /etc/supervisord.conf

# Expose ports (3000 for HTTP, 8080 for OpenFGA HTTP API, 8081 for gRPC)
EXPOSE 3000 8080 8081

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start supervisord as the entrypoint
ENTRYPOINT ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
