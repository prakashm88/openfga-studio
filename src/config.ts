export const config = {
  apiUrl: import.meta.env.VITE_OPENFGA_API_URL || 'https://api.playground-us1.fga.dev',
  apiVersion: 'v1',
  storeId: import.meta.env.VITE_OPENFGA_STORE_ID || '',
  apiToken: import.meta.env.VITE_OPENFGA_API_TOKEN || '',
  defaultAuthorizationModel: `# OpenFGA Authorization Model
schema_version: 1.1
type_definitions:
  - type: user
  - type: document
    relations:
      reader:
        union:
          child:
            - this: writer
      writer:
        this: {}`
};
