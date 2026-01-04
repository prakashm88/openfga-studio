#!/bin/sh
set -e

OPENFGA_HTTP_PORT=${OPENFGA_HTTP_PORT:-8080}
OPENFGA_GRPC_PORT=${OPENFGA_GRPC_PORT:-8081}

# Start OpenFGA binding to configured ports
exec /openfga run --http-addr 0.0.0.0:${OPENFGA_HTTP_PORT} --grpc-addr 0.0.0.0:${OPENFGA_GRPC_PORT} --playground-enabled=false
