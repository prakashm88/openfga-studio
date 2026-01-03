#!/bin/sh
set -eu

# Render templates into place
if [ -f /etc/nginx/nginx.conf.template ]; then
  envsubst '${OPENFGA_HOST} ${OPENFGA_HTTP_PORT} ${OPENFGA_GRPC_PORT} ${UI_PORT} ${OPENFGA_ENDPOINT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
  echo "Rendered /etc/nginx/nginx.conf from template"
fi

if [ -f /etc/templates/config.json.template ]; then
  mkdir -p /usr/share/nginx/html
  envsubst '${OPENFGA_ENDPOINT} ${OPENFGA_HOST} ${OPENFGA_HTTP_PORT}' < /etc/templates/config.json.template > /usr/share/nginx/html/config.json
  echo "Rendered /usr/share/nginx/html/config.json"
fi

# Normalize truthy values
is_truthy() {
  case "${1:-}" in
    1|y|Y|yes|YES|true|TRUE) return 0;;
    *) return 1;;
  esac
}

# Decision precedence: ENABLE_LOCAL_OPENFGA > DISABLE_LOCAL_OPENFGA > OPENFGA_HOST presence > default start local
START_LOCAL=1
if [ -n "${ENABLE_LOCAL_OPENFGA:-}" ]; then
  if is_truthy "$ENABLE_LOCAL_OPENFGA"; then
    START_LOCAL=1
  else
    START_LOCAL=0
  fi
elif [ -n "${DISABLE_LOCAL_OPENFGA:-}" ]; then
  if is_truthy "$DISABLE_LOCAL_OPENFGA"; then
    START_LOCAL=0
  else
    START_LOCAL=1
  fi
elif [ -n "${OPENFGA_HOST:-}" ]; then
  case "${OPENFGA_HOST}" in
    localhost|127.0.0.1|0.0.0.0) START_LOCAL=1;;
    *) START_LOCAL=0;;
  esac
else
  START_LOCAL=1
fi

# Fill in defaults
OPENFGA_HTTP_PORT=${OPENFGA_HTTP_PORT:-8080}
OPENFGA_GRPC_PORT=${OPENFGA_GRPC_PORT:-8081}
OPENFGA_HOST=${OPENFGA_HOST:-127.0.0.1}
OPENFGA_ENDPOINT=${OPENFGA_ENDPOINT:-http://${OPENFGA_HOST}:${OPENFGA_HTTP_PORT}}

echo "Startup config: START_LOCAL=${START_LOCAL} OPENFGA_HOST=${OPENFGA_HOST} OPENFGA_HTTP_PORT=${OPENFGA_HTTP_PORT} OPENFGA_GRPC_PORT=${OPENFGA_GRPC_PORT} OPENFGA_ENDPOINT=${OPENFGA_ENDPOINT}"

if [ "$START_LOCAL" -eq 1 ]; then
  echo "Starting local OpenFGA via supervisorctl..."
  supervisorctl start openfga || true
  # Wait for OpenFGA health (up to 60s)
  i=0
  until curl -fsS "${OPENFGA_ENDPOINT}/health" > /dev/null 2>&1; do
    i=$((i+1))
    if [ $i -ge 60 ]; then
      echo "Timeout waiting for OpenFGA health" >&2
      break
    fi
    sleep 1
  done
else
  echo "Using external OpenFGA at ${OPENFGA_ENDPOINT}; not starting local OpenFGA"
fi

# Start nginx
echo "Starting nginx via supervisorctl..."
supervisorctl start nginx || true

exit 0
