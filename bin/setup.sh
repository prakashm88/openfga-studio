#!/bin/sh
set -eu

# Fill in defaults early so envsubst can replace simple ${VAR} placeholders
OPENFGA_SCHEME=${OPENFGA_SCHEME:-http}
OPENFGA_GRPC_SCHEME=${OPENFGA_GRPC_SCHEME:-grpc}
OPENFGA_HTTP_PORT=${OPENFGA_HTTP_PORT:-}
OPENFGA_GRPC_PORT=${OPENFGA_GRPC_PORT:-8081}
OPENFGA_HOST=${OPENFGA_HOST:-127.0.0.1}
UI_PORT=${UI_PORT:-3000}
OPENFGA_PATH_PREFIX=${OPENFGA_PATH_PREFIX:-}

# Export variables for envsubst (envsubst reads environment variables)
# Parse OPENFGA_ENDPOINT to ensure consistency between ENDPOINT and HOST/PORT
# This ensures that if OPENFGA_ENDPOINT is provided, it takes precedence.
if [ -n "${OPENFGA_ENDPOINT:-}" ]; then
  if echo "${OPENFGA_ENDPOINT}" | grep -q "^https://"; then
    OPENFGA_SCHEME="https"
    _REST="${OPENFGA_ENDPOINT#https://}"
  elif echo "${OPENFGA_ENDPOINT}" | grep -q "^http://"; then
    OPENFGA_SCHEME="http"
    _REST="${OPENFGA_ENDPOINT#http://}"
  else
    OPENFGA_SCHEME="http"
    _REST="${OPENFGA_ENDPOINT}"
  fi

  # Strip path and extract host/port
  _HOST_PORT=$(echo "${_REST}" | cut -d/ -f1)

  # Extract path prefix (e.g. /api) if present, and strip trailing slash
  OPENFGA_PATH_PREFIX="${_REST#$_HOST_PORT}"
  OPENFGA_PATH_PREFIX="${OPENFGA_PATH_PREFIX%/}"

  if echo "${_HOST_PORT}" | grep -q ":[0-9][0-9]*$"; then
    OPENFGA_HTTP_PORT=$(echo "${_HOST_PORT}" | sed 's|.*:\([0-9]*\)$|\1|')
    OPENFGA_HOST=$(echo "${_HOST_PORT}" | sed 's|:\([0-9]*\)$||')
  else
    OPENFGA_HOST="${_HOST_PORT}"
    if [ "${OPENFGA_SCHEME}" = "https" ]; then
      OPENFGA_HTTP_PORT=443
    else
      OPENFGA_HTTP_PORT=80
    fi
  fi
else
  # Construct ENDPOINT from components if not provided
  
  # Determine default port if not provided
  if [ -z "${OPENFGA_HTTP_PORT:-}" ]; then
    case "${OPENFGA_HOST}" in
      localhost|127.0.0.1|0.0.0.0)
        OPENFGA_HTTP_PORT=8080
        ;;
      *)
        if [ "${OPENFGA_SCHEME}" = "https" ]; then
          OPENFGA_HTTP_PORT=443
        else
          OPENFGA_HTTP_PORT=80
        fi
        ;;
    esac
  fi

  if [ -n "${OPENFGA_PATH_PREFIX}" ]; then
     case "${OPENFGA_PATH_PREFIX}" in
       /*) ;;
       *) OPENFGA_PATH_PREFIX="/${OPENFGA_PATH_PREFIX}" ;;
     esac
     OPENFGA_PATH_PREFIX="${OPENFGA_PATH_PREFIX%/}"
  fi
  OPENFGA_ENDPOINT="${OPENFGA_SCHEME}://${OPENFGA_HOST}:${OPENFGA_HTTP_PORT}${OPENFGA_PATH_PREFIX}"

  # Construct ENDPOINT, omitting standard ports to avoid SSL validation issues with some clients
  if [ "${OPENFGA_SCHEME}" = "http" ] && [ "${OPENFGA_HTTP_PORT}" = "80" ]; then
      OPENFGA_ENDPOINT="${OPENFGA_SCHEME}://${OPENFGA_HOST}${OPENFGA_PATH_PREFIX}"
  elif [ "${OPENFGA_SCHEME}" = "https" ] && [ "${OPENFGA_HTTP_PORT}" = "443" ]; then
      OPENFGA_ENDPOINT="${OPENFGA_SCHEME}://${OPENFGA_HOST}${OPENFGA_PATH_PREFIX}"
  else
      OPENFGA_ENDPOINT="${OPENFGA_SCHEME}://${OPENFGA_HOST}:${OPENFGA_HTTP_PORT}${OPENFGA_PATH_PREFIX}"
  fi
fi

if [ "${OPENFGA_SCHEME}" = "https" ]; then
  OPENFGA_GRPC_SCHEME=grpcs
else
  OPENFGA_GRPC_SCHEME=grpc
fi
export OPENFGA_HTTP_PORT OPENFGA_GRPC_PORT OPENFGA_HOST OPENFGA_ENDPOINT UI_PORT OPENFGA_SCHEME OPENFGA_GRPC_SCHEME OPENFGA_PATH_PREFIX

echo "Configs obtained: $OPENFGA_HTTP_PORT $OPENFGA_GRPC_PORT $OPENFGA_HOST $OPENFGA_ENDPOINT $UI_PORT $OPENFGA_SCHEME $OPENFGA_GRPC_SCHEME"

# Basic validation to avoid invalid nginx upstreams
if [ -z "${OPENFGA_HOST}" ]; then
  echo "ERROR: OPENFGA_HOST is empty" >&2
  exit 1
fi
case "${OPENFGA_HTTP_PORT}" in
  ''|*[!0-9]*) echo "ERROR: OPENFGA_HTTP_PORT is not a number: ${OPENFGA_HTTP_PORT}" >&2; exit 1;;
  *) :;;
esac
case "${OPENFGA_GRPC_PORT}" in
  ''|*[!0-9]*) echo "ERROR: OPENFGA_GRPC_PORT is not a number: ${OPENFGA_GRPC_PORT}" >&2; exit 1;;
  *) :;;
esac
case "${UI_PORT}" in
  ''|*[!0-9]*) echo "ERROR: UI_PORT is not a number: ${UI_PORT}" >&2; exit 1;;
  *) :;;
esac

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

# Decide whether to include gRPC proxy block
OPENFGA_GRPC_BLOCK=''
if [ "$START_LOCAL" -eq 1 ]; then
  # local openfga will provide gRPC (expand scheme now)
  OPENFGA_GRPC_BLOCK=$(cat <<EOF
    location /grpc/ {
        grpc_pass ${OPENFGA_GRPC_SCHEME}://openfga_grpc;
        grpc_set_header Host \$host;
        grpc_set_header X-Real-IP \$remote_addr;
    }
EOF
)
else
  # External mode - probe gRPC availability if grpc_health_probe exists
  if command -v grpc_health_probe >/dev/null 2>&1; then
    if grpc_health_probe -addr "${OPENFGA_HOST}:${OPENFGA_GRPC_PORT}" -connect-timeout 2s >/dev/null 2>&1; then
      OPENFGA_GRPC_BLOCK=$(cat <<EOF
    location /grpc/ {
        grpc_pass ${OPENFGA_GRPC_SCHEME}://openfga_grpc;
        grpc_set_header Host \$host;
        grpc_set_header X-Real-IP \$remote_addr;
    }
EOF
)
    else
      echo "gRPC endpoint not available on ${OPENFGA_HOST}:${OPENFGA_GRPC_PORT}; leaving gRPC proxy disabled"
    fi
  else
    echo "grpc_health_probe not present; skipping gRPC availability check; leaving gRPC proxy disabled"
  fi
fi
export OPENFGA_GRPC_BLOCK

# Render templates into place
if [ -f /etc/nginx/nginx.conf.template ]; then
  envsubst '${OPENFGA_HOST} ${OPENFGA_HTTP_PORT} ${OPENFGA_GRPC_PORT} ${UI_PORT} ${OPENFGA_ENDPOINT} ${OPENFGA_SCHEME} ${OPENFGA_GRPC_SCHEME} ${OPENFGA_GRPC_BLOCK} ${OPENFGA_PATH_PREFIX}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
  echo "Rendered /etc/nginx/nginx.conf from template"
  echo "--- Rendered nginx.conf (first 80 lines) ---"
  sed -n '1,80p' /etc/nginx/nginx.conf || true
fi

if [ -f /etc/templates/config.json.template ]; then
  mkdir -p /usr/share/nginx/html
  envsubst '${OPENFGA_ENDPOINT} ${OPENFGA_HOST} ${OPENFGA_HTTP_PORT}' < /etc/templates/config.json.template > /usr/share/nginx/html/config.json
  echo "Rendered /usr/share/nginx/html/config.json"
  echo "--- config.json ---"
  sed -n '1,40p' /usr/share/nginx/html/config.json || true
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

# Log the final resolved values
echo "Startup config: START_LOCAL=${START_LOCAL} OPENFGA_HOST=${OPENFGA_HOST} OPENFGA_HTTP_PORT=${OPENFGA_HTTP_PORT} OPENFGA_GRPC_PORT=${OPENFGA_GRPC_PORT} OPENFGA_ENDPOINT=${OPENFGA_ENDPOINT} UI_PORT=${UI_PORT}"

# Validate nginx config before starting services
if nginx -t 2>/tmp/nginx-test.log; then
  echo "nginx config test: OK"
else
  echo "nginx config test: FAILED"
  echo "--- /etc/nginx/nginx.conf ---"
  sed -n '1,160p' /etc/nginx/nginx.conf || true
  echo "--- /tmp/nginx-test.log ---"
  sed -n '1,160p' /tmp/nginx-test.log || true
  exit 1
fi

if [ "$START_LOCAL" -eq 1 ]; then
  echo "Starting local OpenFGA via supervisorctl..."
  # Wait until supervisorctl is available
  j=0
  until supervisorctl status >/dev/null 2>&1; do
    j=$((j+1))
    if [ $j -ge 10 ]; then
      echo "supervisorctl not available after wait" >&2
      break
    fi
    sleep 1
  done
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
# Ensure supervisorctl is available before starting nginx
k=0
until supervisorctl status >/dev/null 2>&1; do
  k=$((k+1))
  if [ $k -ge 10 ]; then
    echo "supervisorctl not available after wait (nginx start)" >&2
    break
  fi
  sleep 1
done
supervisorctl start nginx || true

exit 0
