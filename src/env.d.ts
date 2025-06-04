/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENFGA_API_URL: string
  readonly VITE_OPENFGA_STORE_ID: string
  readonly VITE_OPENFGA_API_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
