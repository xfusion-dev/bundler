const AI_API_URL = 'https://ai-api.xfusion.finance';

export interface AiAllocation {
  asset_id: string;
  percentage: number;
}

export interface AiBundleResponse {
  valid: boolean;
  reason?: string;
  name?: string;
  symbol?: string;
  description?: string;
  allocations?: AiAllocation[];
}

class AiService {
  async generateBundle(prompt: string): Promise<AiBundleResponse> {
    try {
      const response = await fetch(`${AI_API_URL}/api/ai/generate-bundle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data: AiBundleResponse = await response.json();
      return data;
    } catch (error) {
      console.error('AI bundle generation failed:', error);
      throw error;
    }
  }
}

export const aiService = new AiService();
