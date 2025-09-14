import { AuthClient } from '@dfinity/auth-client';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

export interface SignatureData {
  signature: string;
  publicKey: string;
  principal: string;
}

class CryptoService {
  private authClient: AuthClient | null = null;

  async init() {
    if (!this.authClient) {
      this.authClient = await AuthClient.create();
    }
  }

  async getIdentity(): Promise<Identity | null> {
    await this.init();
    if (!this.authClient?.isAuthenticated()) {
      return null;
    }
    return this.authClient.getIdentity();
  }

  async getPrincipal(): Promise<Principal | null> {
    const identity = await this.getIdentity();
    return identity ? identity.getPrincipal() : null;
  }

  async getPublicKey(): Promise<string | null> {
    const identity = await this.getIdentity();
    if (!identity) return null;

    try {
      // For Internet Identity, we need to extract the public key from the identity
      // This is a simplified approach - in reality, II uses more complex key derivation
      const principal = identity.getPrincipal();
      const principalBytes = principal.toUint8Array();
      
      // Generate a deterministic public key from the principal (same logic as backend)
      const hashBuffer = await crypto.subtle.digest('SHA-256', principalBytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Failed to extract public key:', error);
      return null;
    }
  }

  async signMessage(message: string): Promise<string | null> {
    try {
      const identity = await this.getIdentity();
      if (!identity) return null;

      // For Internet Identity, we need to use the identity's signing capability
      // This is a simplified version - real implementation would use the identity's sign method
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(message);
      
      // Generate a pseudo-signature for demo
      // In reality, you'd use: await identity.sign(messageBytes)
      const principal = identity.getPrincipal();
      const principalBytes = principal.toUint8Array();
      
      // Create a deterministic "signature" based on principal + message
      const combinedData = new Uint8Array(principalBytes.length + messageBytes.length);
      combinedData.set(principalBytes);
      combinedData.set(messageBytes, principalBytes.length);
      
      // Hash the combined data to create a consistent signature
      const hashBuffer = await crypto.subtle.digest('SHA-256', combinedData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Failed to sign message:', error);
      return null;
    }
  }

  async generateSignatureData(message: string): Promise<SignatureData | null> {
    try {
      const [signature, publicKey, principal] = await Promise.all([
        this.signMessage(message),
        this.getPublicKey(),
        this.getPrincipal()
      ]);

      if (!signature || !publicKey || !principal) {
        throw new Error('Failed to generate signature components');
      }

      return {
        signature,
        publicKey,
        principal: principal.toString()
      };
    } catch (error) {
      console.error('Failed to generate signature data:', error);
      return null;
    }
  }
}

export const cryptoService = new CryptoService(); 