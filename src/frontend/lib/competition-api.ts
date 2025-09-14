import { cryptoService } from './crypto';

const API_BASE_URL = (import.meta.env.VITE_COMPETITION_API_URL as string) || 'https://sub-api.xfusion.finance/api';

export interface SubscribeRequest {
  bundle_id: string;
  principal: string;
  email: string;
}

export interface ShareRequest {
  bundle_id: string;
  principal: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
}

export const competitionApi = {
  async subscribe(request: SubscribeRequest): Promise<ApiResponse> {
    const message = `${request.bundle_id}${request.principal}${request.email}`;
    const signatureData = await cryptoService.generateSignatureData(message);
    
    if (!signatureData) {
      throw new Error('Failed to generate signature - please ensure you are logged in');
    }

    const response = await fetch(`${API_BASE_URL}/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        signature: signatureData.signature,
        public_key: signatureData.publicKey,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Subscription failed');
    }

    return response.json();
  },

  async recordShare(request: ShareRequest): Promise<ApiResponse> {
    const message = `${request.bundle_id}${request.principal}`;
    const signatureData = await cryptoService.generateSignatureData(message);
    
    if (!signatureData) {
      throw new Error('Failed to generate signature - please ensure you are logged in');
    }

    const response = await fetch(`${API_BASE_URL}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        signature: signatureData.signature,
        public_key: signatureData.publicKey,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Share recording failed');
    }

    return response.json();
  },

  async checkSubscription(bundle_id: string, principal: string): Promise<{ is_subscribed: boolean; has_shared: boolean }> {
    const response = await fetch(`${API_BASE_URL}/check-subscription?bundle_id=${bundle_id}&principal=${principal}`);
    
    if (!response.ok) {
      throw new Error('Failed to check subscription status');
    }

    return response.json();
  },

  async getBundleStats(bundle_id: string): Promise<{ total_subscribers: number; total_shares: number }> {
    const response = await fetch(`${API_BASE_URL}/bundle-stats/${bundle_id}`);
    
    if (!response.ok) {
      throw new Error('Failed to get bundle stats');
    }

    return response.json();
  },
}; 