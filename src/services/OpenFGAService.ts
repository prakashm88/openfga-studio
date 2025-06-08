import axios from 'axios';
import { config } from '../config';
import { dslToJson, jsonToDsl } from '../utils/modelConverter';
import type { OpenFGAModel } from '../types/models';

interface OpenFGAError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

class OpenFGAServiceError extends Error {
  code?: string;
  details?: Record<string, unknown>;

  constructor(error: OpenFGAError) {
    super(error.message);
    this.code = error.code;
    this.details = error.details;
    this.name = 'OpenFGAServiceError';
  }
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(config.apiToken ? { 'Authorization': `Bearer ${config.apiToken}` } : {}),
  },
  timeout: 10000,
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

export const OpenFGAService = {
  async listStores() {
    const response = await api.get('/stores');
    return response.data;
  },

  async createStore(name: string) {
    // Create the store first
    const response = await api.post('/stores', {
      name: name,
      description: 'OpenFGA Playground Store'
    });
    
    // Immediately write our default authorization model to the new store
    const storeId = response.data.id;
    await this.writeAuthorizationModel(storeId, config.defaultAuthorizationModel);
    
    return response.data;
  },

  async writeAuthorizationModel(storeId: string, model: string) {
    try {
      // Convert to JSON if it's in DSL format
      const jsonModel = model.trim().startsWith('{') 
        ? JSON.parse(model) as OpenFGAModel
        : dslToJson(model);

      // Validate the model has required fields
      if (!jsonModel.schema_version || !Array.isArray(jsonModel.type_definitions)) {
        throw new Error('Invalid authorization model format');
      }

      const response = await api.post(`/stores/${storeId}/authorization-models`, jsonModel);
      return response.data;
    } catch (error) {
      console.error('Failed to write authorization model:', error);
      throw error;
    }
  },

  async getAuthorizationModel(storeId: string) {
    try {
      const response = await api.get(`/stores/${storeId}/authorization-models`);
      const latestModel = response.data.authorization_models[0];
      // Convert JSON model to DSL for display
      return latestModel ? jsonToDsl(latestModel) : config.defaultAuthorizationModel;
    } catch (error) {
      console.error('Failed to get authorization model:', error);
      return config.defaultAuthorizationModel;
    }
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
