import axios, { AxiosInstance } from 'axios';

interface QuoteRequest {
  quoteId: string;
}

interface QuoteResponse {
  success: boolean;
  quoteId: string;
  resolver: string;
  price: number;
  validUntil: string;
}

interface QuoteStatus {
  success: boolean;
  quoteId: string;
  status: string;
  quote?: any;
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

  async processQuote(quoteId: string): Promise<QuoteResponse> {
    try {
      const response = await this.client.post<QuoteResponse>(`/quote/process/${quoteId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to process quote:', error);
      throw new Error(error.response?.data?.message || 'Failed to process quote');
    }
  }

  async getQuoteStatus(quoteId: string): Promise<QuoteStatus> {
    try {
      const response = await this.client.get<QuoteStatus>(`/quote/${quoteId}/status`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get quote status:', error);
      throw new Error(error.response?.data?.message || 'Failed to get quote status');
    }
  }

  async getHealth(): Promise<boolean> {
    try {
      await this.client.get('/');
      return true;
    } catch (error) {
      console.error('Coordinator health check failed:', error);
      return false;
    }
  }

  async getResolverStatus(): Promise<any> {
    try {
      const response = await this.client.get('/quote/health');
      return response.data;
    } catch (error: any) {
      console.error('Failed to get resolver status:', error);
      throw new Error(error.response?.data?.message || 'Failed to get resolver status');
    }
  }
}

export const coordinatorService = new CoordinatorService();