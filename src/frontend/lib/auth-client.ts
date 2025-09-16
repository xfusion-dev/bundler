import { AuthClient } from '@dfinity/auth-client';
import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { backend } from '../declarations/backend';

const LOCAL_II_CANISTER_ID = 'rdmx6-jaaaa-aaaaa-aaadq-cai';

const LOCAL_II_URL = `http://${LOCAL_II_CANISTER_ID}.localhost:4943`;

const PRODUCTION_II_URL = 'https://identity.ic0.app';

const isLocal = true;


export class IIAuthClient {
  private authClient: AuthClient | null = null;
  private identity: Identity | null = null;
  private principal: Principal | null = null;
  private agent: HttpAgent | null = null;

  async init(): Promise<void> {
    this.authClient = await AuthClient.create();

    const isAuthenticated = await this.authClient.isAuthenticated();

    if (isAuthenticated) {
      this.identity = this.authClient.getIdentity();
      this.principal = this.identity.getPrincipal();
      this.setupAgent();
    }
  }

  private setupAgent(): void {
    if (!this.identity) return;

    this.agent = new HttpAgent({
      identity: this.identity,
      host: isLocal ? 'http://localhost:4943' : 'https://ic0.app',
    });

    if (isLocal) {
      this.agent.fetchRootKey().catch((err) => {
        console.error('Failed to fetch root key:', err);
      });
    }
  }

  async login(): Promise<Principal | null> {
    if (!this.authClient) {
      await this.init();
    }

    const iiUrl = isLocal ? LOCAL_II_URL : PRODUCTION_II_URL;

    console.log('Attempting to login with II URL:', iiUrl);

    return new Promise((resolve, reject) => {
      this.authClient!.login({
        identityProvider: iiUrl,
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000),
        windowOpenerFeatures: `
          left=${window.screen.width / 2 - 525 / 2},
          top=${window.screen.height / 2 - 705 / 2},
          toolbar=0,location=0,menubar=0,width=525,height=705
        `,
        onSuccess: () => {
          this.identity = this.authClient!.getIdentity();
          this.principal = this.identity.getPrincipal();
          this.setupAgent();
          resolve(this.principal);
        },
        onError: (error) => {
          console.error('Login failed:', error);
          reject(error);
        },
      });
    });
  }

  async logout(): Promise<void> {
    if (!this.authClient) return;

    await this.authClient.logout();
    this.identity = null;
    this.principal = null;
    this.agent = null;
  }

  getPrincipal(): Principal | null {
    return this.principal;
  }

  getIdentity(): Identity | null {
    return this.identity;
  }

  getAgent(): HttpAgent | null {
    return this.agent;
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.authClient) {
      await this.init();
    }
    return this.authClient!.isAuthenticated();
  }

  getActor(canisterId: string, idlFactory: any): any {
    if (!this.agent) {
      throw new Error('Not authenticated');
    }

    return Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId,
    });
  }
}

export const authClient = new IIAuthClient();

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  principal: Principal | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  principal: null,
  login: async () => {},
  logout: async () => {},
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await authClient.init();
        const authenticated = await authClient.isAuthenticated();

        if (authenticated) {
          const p = authClient.getPrincipal();
          setPrincipal(p);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async () => {
    setLoading(true);
    try {
      const p = await authClient.login();
      if (p) {
        setPrincipal(p);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authClient.logout();
      setPrincipal(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, principal, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export class MockAuthClient {
  private mockPrincipal = Principal.fromText('2vxsx-fae');
  private isAuth = false;

  async init(): Promise<void> {
    const stored = localStorage.getItem('mock_auth');
    this.isAuth = stored === 'true';
  }

  async login(): Promise<Principal> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.isAuth = true;
        localStorage.setItem('mock_auth', 'true');
        resolve(this.mockPrincipal);
      }, 1000);
    });
  }

  async logout(): Promise<void> {
    this.isAuth = false;
    localStorage.removeItem('mock_auth');
  }

  getPrincipal(): Principal | null {
    return this.isAuth ? this.mockPrincipal : null;
  }

  async isAuthenticated(): Promise<boolean> {
    return this.isAuth;
  }
}

export const mockAuthClient = new MockAuthClient();