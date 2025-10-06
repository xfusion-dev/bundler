import axios, { AxiosInstance } from 'axios';

interface GetQuoteRequest {
  bundleId: number;
  operation: any;
  user: string;
}

interface QuoteObject {
  bundle_id: number;
  operation: any;
  resolver: string;
  nav_tokens: number;
  ckusdc_amount: number;
  asset_amounts: Array<{ asset_id: string; amount: number }>;
  fees: number;
  valid_until: number;
  nonce: number;
  coordinator_signature: number[];
}

interface NotifyAcceptedRequest {
  assignmentId: number;
  resolverPrincipal: string;
}

class CoordinatorService {
  private client: AxiosInstance;

  constructor() {
    const baseURL = import.meta.env.VITE_COORDINATOR_API_URL || 'http://localhost:3000';

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        console.log(`[Coordinator] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[Coordinator] Request error:', error);
        return Promise.reject(error);
      },
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log(`[Coordinator] Response:`, response.data);
        return response;
      },
      (error) => {
        console.error('[Coordinator] Response error:', error.response?.data || error.message);
        return Promise.reject(error);
      },
    );
  }

  async getQuote(bundleId: number, operation: any, user: string): Promise<QuoteObject> {
    try {
      const response = await this.client.post<QuoteObject>('/quote/get', {
        bundleId,
        operation,
        user,
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to get quote:', error);
      throw new Error(error.response?.data?.message || 'Failed to get quote');
    }
  }

  async notifyAccepted(assignmentId: number, resolverPrincipal: string): Promise<void> {
    try {
      await this.client.post('/quote/accepted', {
        assignmentId,
        resolverPrincipal,
      });
    } catch (error: any) {
      console.error('Failed to notify coordinator of quote acceptance:', error);
      throw new Error(error.response?.data?.message || 'Failed to notify acceptance');
    }
  }

  async getHealth(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch (error) {
      console.error('Coordinator health check failed:', error);
      return false;
    }
  }
}

export const coordinatorService = new CoordinatorService();