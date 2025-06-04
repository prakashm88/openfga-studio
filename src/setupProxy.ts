import { createProxyMiddleware } from 'http-proxy-middleware';

export default function setupProxy(app: any) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '', // remove /api prefix when forwarding to target
      },
      onProxyReq: (proxyReq, req) => {
        proxyReq.setHeader('Content-Type', 'application/json');
        // Add any auth headers if needed
        // proxyReq.setHeader('Authorization', `Bearer ${token}`);
      },
    })
  );
}
