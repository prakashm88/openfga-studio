// OpenFGA API service
import axios from 'axios';
import { dslToJson, jsonToDsl } from '../utils/modelConverter'; 

// Create axios instance with common config
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
});

interface RelationshipTuple {
  user: string;
  relation: string;
  object: string;
  condition?: {
    name: string;
    context: Record<string, string | number | boolean>;
  };
}

export class OpenFGAService {
  static async createStore(name: string): Promise<{ id: string; name: string }> {
    try {
      const response = await api.post('/stores', { name });
      return response.data;
    } catch (error) {
      console.error('Failed to create store:', error);
      throw error;
    }
  }

  static async listStores(): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await api.get('/stores');
      if (!response.data) {
        throw new Error('No data received from the API');
      }
      const stores = response.data.stores;
      if (!Array.isArray(stores)) {
        throw new Error('Invalid response format: stores is not an array');
      }
      return stores.map(store => ({
        id: store.id,
        name: store.name || `Store ${store.id}`
      }));
    } catch (error) {
      console.error('Failed to list stores:', error);
      throw error; // Let the component handle the error
    }
  }

  static async writeAuthorizationModel(storeId: string, model: string): Promise<{ authorization_model_id: string }> {
    try {
      // Convert DSL to JSON if it's not already in JSON format
      let jsonModel = model;
      if (!model.trim().startsWith('{')) {
        jsonModel = JSON.stringify(dslToJson(model));
      }
      
      const response = await api.post(`/stores/${storeId}/authorization-models`, jsonModel, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to write authorization model:', error);
      throw error;
    }
  }

  static async listTuples(storeId: string): Promise<{ tuples: RelationshipTuple[] }> {
    try {
      // Transform the response to match our RelationshipTuple interface
      interface TupleResponse {
        key: {
          user: string;
          relation: string;
          object: string;
          condition?: {
            name: string;
            context: Record<string, string | number | boolean>;
          };
        };
        timestamp: string;
      }

      let allTuples: TupleResponse[] = [];
      let continuationToken: string | undefined = undefined;

      // Fetch all pages of tuples
      do {
        const requestBody: {
          page_size?: number;
          continuation_token?: string;
        } = {
          page_size: 100 // Maximum allowed by OpenFGA API
        };

        if (continuationToken) {
          requestBody.continuation_token = continuationToken;
        }

        const response = await api.post(`/stores/${storeId}/read`, requestBody, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        const pageTuples = response.data.tuples || [];
        allTuples = allTuples.concat(pageTuples);

        // Check if there's a continuation token for the next page
        continuationToken = response.data.continuation_token;
      } while (continuationToken);

      // Sort tuples by timestamp in descending order (latest first)
      const sortedTuples = [...allTuples].sort((a: TupleResponse, b: TupleResponse) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      const tuples = sortedTuples.map((tuple: TupleResponse) => ({
        user: tuple.key.user,
        relation: tuple.key.relation,
        object: tuple.key.object,
        condition: tuple.key.condition
      }));

      return { tuples };
    } catch (error) {
      console.error('Failed to list tuples:', error);
      return { tuples: [] };
    }
  }

  static async writeTuple(storeId: string, tuple: RelationshipTuple, authModelId: string): Promise<void> {
    try {
      // Filter out empty condition parameters
      const condition = tuple.condition ? {
        name: tuple.condition.name,
        context: Object.fromEntries(
          Object.entries(tuple.condition.context)
            .filter(([, value]) => value !== undefined && value !== null && value !== '')
        )
      } : undefined;

      await api.post(`/stores/${storeId}/write`, {
        writes: {
          tuple_keys: [{
            user: tuple.user,
            relation: tuple.relation,
            object: tuple.object,
            ...(condition && Object.keys(condition.context).length > 0 ? { condition } : {})
          }]
        },
        authorization_model_id: authModelId
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Failed to write tuple:', error);
      throw error;
    }
  }

  static async deleteTuple(storeId: string, tuple: RelationshipTuple, authModelId: string): Promise<void> {
    try {
      await api.post(`/stores/${storeId}/write`, {
        deletes: {
          tuple_keys: [{
            user: tuple.user,
            relation: tuple.relation,
            object: tuple.object,
            ...(tuple.condition ? { condition: tuple.condition } : {})
          }]
        },
        authorization_model_id: authModelId
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Failed to delete tuple:', error);
      throw error;
    }
  }

  static async check(storeId: string, query: RelationshipTuple, authorizationModelId?: string): Promise<{ allowed: boolean }> {
    try {
      const response = await api.post(`/stores/${storeId}/check`, {
        tuple_key: {
          user: query.user,
          relation: query.relation,
          object: query.object
        },
        context: query.condition?.context,
        ...(authorizationModelId && { authorization_model_id: authorizationModelId })
      });
      return { allowed: response.data.allowed };
    } catch (error) {
      console.error('Check request failed:', error);
      return { allowed: false };
    }
  }

  static async listAuthorizationModels(storeId: string): Promise<Array<{ id: string; schemaVersion: string }>> {
    try {
      const response = await api.get(`/stores/${storeId}/authorization-models`);
      return response.data.authorization_models || [];
    } catch (error) {
      console.error('Failed to list authorization models:', error);
      return [];
    }
  }

  static async getAuthorizationModel(storeId: string, modelId?: string): Promise<{ model: string; modelId?: string }> {
    try {
      // If no modelId is provided, try to get the latest one
      if (!modelId) {
        const models = await this.listAuthorizationModels(storeId);
        modelId = models.length > 0 ? models[0].id : undefined;
      }

      if (!modelId) {
        return { model: '', modelId: undefined }; // No models exist yet
      }

      // Get the authorization model
      const response = await api.get(`/stores/${storeId}/authorization-models/${modelId}`);
      const authModel = response.data.authorization_model;

      // Convert JSON model to DSL format
      const dslModel = jsonToDsl(authModel);

      return {
        model: dslModel,
        modelId
      };
    } catch (error) {
      console.error('Failed to get authorization model:', error);
      return { model: '', modelId: undefined };
    }
  }
}
