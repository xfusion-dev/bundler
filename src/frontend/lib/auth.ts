import { AuthClient } from '@dfinity/auth-client';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// Internet Identity URL for mainnet
const IDENTITY_PROVIDER = 'https://identity.ic0.app';

export interface AuthState {
  isAuthenticated: boolean;
  principal: Principal | null;
  agent: HttpAgent | null;
}

class AuthService {
  private authClient: AuthClient | null = null;
  private agent: HttpAgent | null = null;

  async init(): Promise<AuthClient> {
    if (!this.authClient) {
      this.authClient = await AuthClient.create();
    }
    return this.authClient;
  }

  async login(): Promise<boolean> {
    try {
      const authClient = await this.init();
      
      return new Promise((resolve) => {
        authClient.login({
          identityProvider: IDENTITY_PROVIDER,
          maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
          windowOpenerFeatures: 'toolbar=0,location=0,menubar=0,width=500,height=500,left=100,top=100',
          onSuccess: () => {
            void this.setupAgent();
            resolve(true);
          },
          onError: (error) => {
            console.error('Login failed:', error);
            resolve(false);
          },
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      const authClient = await this.init();
      await authClient.logout();
      this.agent = null;
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const authClient = await this.init();
      return await authClient.isAuthenticated();
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  }

  async getPrincipal(): Promise<Principal | null> {
    try {
      const authClient = await this.init();
      const identity = authClient.getIdentity();
      return identity.getPrincipal();
    } catch (error) {
      console.error('Get principal error:', error);
      return null;
    }
  }

  async getAgent(): Promise<HttpAgent | null> {
    if (!this.agent) {
      await this.setupAgent();
    }
    return this.agent;
  }

  private async setupAgent(): Promise<void> {
    try {
      const authClient = await this.init();
      const identity = authClient.getIdentity();
      
      this.agent = new HttpAgent({
        identity,
        host: 'https://ic0.app', // Mainnet
      });

      // Note: Don't fetch root key on mainnet
      // Only needed for local development
    } catch (error) {
      console.error('Agent setup error:', error);
    }
  }

  async getAuthState(): Promise<AuthState> {
    const isAuth = await this.isAuthenticated();
    const principal = isAuth ? await this.getPrincipal() : null;
    const agent = isAuth ? await this.getAgent() : null;

    return {
      isAuthenticated: isAuth,
      principal,
      agent,
    };
  }

  // Helper to create actors with authentication
  async createActor<T>(canisterId: string, idlFactory: any): Promise<T | null> {
    try {
      const agent = await this.getAgent();
      if (!agent) return null;

      return Actor.createActor<T>(idlFactory, {
        agent,
        canisterId,
      });
    } catch (error) {
      console.error('Create actor error:', error);
      return null;
    }
  }

  // Format principal for display
  formatPrincipal(principal: Principal | null): string {
    if (!principal) return 'Not connected';
    const text = principal.toText();
    return `${text.slice(0, 5)}...${text.slice(-3)}`;
  }
}

// Export singleton instance
export const authService = new AuthService();

// React hook for authentication state
export function useAuth() {
  // This will be implemented with React context/state management
  // For now, return the service methods
  return {
    login: () => authService.login(),
    logout: () => authService.logout(),
    isAuthenticated: () => authService.isAuthenticated(),
    getPrincipal: () => authService.getPrincipal(),
    getAuthState: () => authService.getAuthState(),
    formatPrincipal: (principal: Principal | null) => authService.formatPrincipal(principal),
  };
} 