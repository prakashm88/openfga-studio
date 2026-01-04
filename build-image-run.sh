#!/bin/sh
set -e

# Stop/remove old containers
podman stop openfga-playground-local || true
podman rm openfga-playground-local || true
podman stop openfga-playground-external || true
podman rm openfga-playground-external || true
podman stop openfga-playground-external-additional || true
podman rm openfga-playground-external-additional || true

# Build the image
podman build -t openfga-studio:latest .

# Run local instance (embedded OpenFGA). UI on host:3010
podman run -d --name openfga-playground-local \
  -p 3010:3000 \
  -p 8080:8080 \
  -p 8081:8081 \
  openfga-studio:latest

# Run external-backend instance (UI proxies to https://api.playground-us1.fga.dev). UI on host:3020
podman run -d --name openfga-playground-external \
  -p 3020:3000 \
  -e OPENFGA_ENDPOINT=https://openfga-studio.onrender.com/api \
  openfga-studio:latest

# Run external-backend instance (UI proxies to https://api.playground-us1.fga.dev). UI on host:3020
podman run -d --name openfga-playground-external-additional \
  -p 3030:3000 \
  -e OPENFGA_SCHEME=https \
  -e OPENFGA_HOST=openfga-studio.onrender.com \
  -e OPENFGA_PATH_PREFIX=api \
  openfga-studio:latest

echo "\n"
echo "UI with Local Embedded OpenFGA: http://localhost:3010"
echo "UI with External OpenFGA using OPENFGA_ENDPOINT: http://localhost:3020"
echo "UI with External OpenFGA using other attributes - OPENFGA_HTTP_PORT, OPENFGA_SCHEME, OPENFGA_HOST, OPENFGA_PATH_PREFIX: http://localhost:3030"
echo "\n"