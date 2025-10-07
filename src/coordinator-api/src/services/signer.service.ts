import { Injectable, OnModuleInit } from '@nestjs/common';
import * as ed25519 from '@noble/ed25519';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SignerService implements OnModuleInit {
  private privateKey: Uint8Array;
  private publicKey: Uint8Array;

  async onModuleInit() {
    await this.initSigner();
  }

  private async initSigner() {
    const keyPath = process.env.ED25519_KEY_PATH || './.ed25519.key';
    const keyFile = path.resolve(keyPath);

    if (fs.existsSync(keyFile)) {
      const keyHex = fs.readFileSync(keyFile, 'utf-8').trim();
      this.privateKey = this.hexToBytes(keyHex);
      this.publicKey = await ed25519.getPublicKeyAsync(this.privateKey);
      console.log('[Signer] Loaded Ed25519 keypair from', keyFile);
      console.log('[Signer] Public key:', this.bytesToHex(this.publicKey));
    } else {
      this.privateKey = ed25519.utils.randomSecretKey();
      this.publicKey = await ed25519.getPublicKeyAsync(this.privateKey);

      const keyHex = this.bytesToHex(this.privateKey);
      fs.writeFileSync(keyFile, keyHex, 'utf-8');

      console.warn('[Signer] Generated NEW Ed25519 keypair (saved to', keyFile + ')');
      console.warn('[Signer] Public key:', this.bytesToHex(this.publicKey));
      console.warn('[Signer] IMPORTANT: Configure this public key in backend canister!');
    }
  }

  async signQuote(quote: any): Promise<Uint8Array> {
    const message = this.serializeQuote(quote);
    const signature = await ed25519.signAsync(message, this.privateKey);
    return signature;
  }

  getPublicKey(): Uint8Array {
    return this.publicKey;
  }

  getPublicKeyHex(): string {
    return this.bytesToHex(this.publicKey);
  }

  private serializeQuote(quote: any): Uint8Array {
    const parts = [
      quote.bundle_id.toString(),
      JSON.stringify(quote.operation),
      quote.resolver,
      quote.nav_tokens.toString(),
      quote.ckusdc_amount.toString(),
      JSON.stringify(quote.asset_amounts),
      quote.fees.toString(),
      quote.valid_until.toString(),
      quote.nonce.toString(),
    ];
    const message = parts.join('|');
    return new TextEncoder().encode(message);
  }

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
