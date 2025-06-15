# Development Guide

This guide explains the different ways to run and develop OpenFGA Studio.

## Development Options

### 1. Local Development with Vite

For the best development experience with hot-reload:

```bash
# Install dependencies
npm install

# Start the Vite dev server
npm run dev
```

The development server will start at `http://localhost:5173`. By default, it's configured to proxy OpenFGA requests to a local OpenFGA instance running on port 8080.

#### Configuration
The development proxy is configured in `vite.config.ts`:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

### 2. Running with Docker Compose

The easiest way to run the complete stack:

```bash
# Build and start the services
docker compose up --build

# Or in detached mode
docker compose up -d --build
```

This will:
- Build the React application
- Start Nginx to serve the static files
- Run OpenFGA server
- Configure proper routing through Nginx

Access the application at `http://localhost:3000`

### 3. Building and Running the Container Manually

If you need more control over the container:

```bash
# Build the container
docker build -t openfga-studio:latest .

# Run the container
docker run -d \
  --name openfga-studio \
  -p 3000:3000 \
  openfga-studio:latest
```

## Architecture Details

### Container Stack
- **Nginx**: Serves static files and handles reverse proxy
- **OpenFGA**: Runs the authorization server
- **Supervisord**: Manages both Nginx and OpenFGA processes

### Port Mappings
- `3000`: Main application (Nginx)
  - `/`: Static files (React application)
  - `/api/`: OpenFGA HTTP API (proxied)
  - `/grpc/`: OpenFGA gRPC (proxied)

### Health Checks
The container includes health checks for both:
- HTTP endpoint at `/health`
- OpenFGA service status

## Common Development Tasks

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npm run type-check
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Ensure ports 3000, 8080, and 8081 are not in use
   - Use `lsof -i :PORT` to check for conflicting processes

2. **OpenFGA Connection Issues**
   - Check if OpenFGA is running: `curl http://localhost:8080/healthz`
   - Verify Nginx proxy configuration
   - Check container logs: `docker compose logs`

3. **Development Server Issues**
   - Clear Vite cache: `rm -rf node_modules/.vite`
   - Verify proxy settings in `vite.config.ts`
