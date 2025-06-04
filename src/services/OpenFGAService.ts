import axios from 'axios';

interface OpenFGAError {
  message: string;
  code?: string;
  details?: any;
}

class OpenFGAServiceError extends Error {
  code?: string;
  details?: any;

  constructor(error: OpenFGAError) {
    super(error.message);
    this.code = error.code;
    this.details = error.details;
    this.name = 'OpenFGAServiceError';
  }
}

import { config } from '../config';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(config.apiToken ? { 'Authorization': `Bearer ${config.apiToken}` } : {}),
  },
  timeout: 10000, // 10 second timeout
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorData: OpenFGAError = {
      message: error.response?.data?.message || error.message || 'Unknown error occurred',
      code: error.response?.data?.code,
      details: error.response?.data?.details,
    };
    throw new OpenFGAServiceError(errorData);
  }
);

export interface RelationshipTuple {
  user: string;
  relation: string;
  object: string;
}

export interface RelationDefinition {
  this?: Record<string, never>;
  union?: {
    child: string[];
  };
  computedUserset?: {
    relation: string;
  };
}

export interface TypeDefinition {
  type: string;
  relations?: Record<string, RelationDefinition>;
}

export interface AuthorizationModel {
  schema_version: string;
  type_definitions: TypeDefinition[];
}

export interface CheckResponse {
  allowed: boolean;
}

export const OpenFGAService = {
  async listStores() {
    const response = await api.get('/stores');
    return response.data;
  },

  async createStore(name: string) {
    const storeId = config.storeId;
    if (storeId) {
      return { id: storeId };
    }
    const response = await api.post('/stores', {
      name: name,
      description: 'OpenFGA Playground Store'
    });
    return response.data;
  },

  async writeAuthorizationModel(storeId: string, dslContent: string) {
    const response = await api.post(`/stores/${storeId}/authorization-models`, {
      type_definitions: dslContent,
    });
    return response.data;
  },

  async writeTuple(storeId: string, tuple: RelationshipTuple) {
    const response = await api.post(`/stores/${storeId}/write`, {
      writes: {
        tuple_keys: [{
          user: tuple.user,
          relation: tuple.relation,
          object: tuple.object,
        }],
      },
    });
    return response.data;
  },

  async listTuples(storeId: string): Promise<{ tuples: RelationshipTuple[] }> {
    try {
      const response = await api.post(`/stores/${storeId}/read`, {
        tuple_key: {
          user: '*',
          relation: '*',
          object: '*'
        }
      });
      return { tuples: response.data.tuples || [] };
    } catch (error) {
      console.error('Failed to list tuples:', error);
      return { tuples: [] };
    }
  },

  async check(storeId: string, query: RelationshipTuple): Promise<{ allowed: boolean }> {
    try {
      const response = await api.post(`/stores/${storeId}/check`, {
        tuple_key: {
          user: query.user,
          relation: query.relation,
          object: query.object,
        },
      });
      return { allowed: response.data.allowed };
    } catch (error) {
      console.error('Check request failed:', error);
      return { allowed: false };
    }
  },
};
