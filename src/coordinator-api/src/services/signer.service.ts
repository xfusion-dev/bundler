import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import * as bip39 from 'bip39';
import * as ed25519 from '@noble/ed25519';

@Injectable()
export class SignerService implements OnModuleInit {
  private identity: Ed25519KeyIdentity;
  private legacyPrivateKey: Uint8Array;
  private legacyPublicKey: Uint8Array;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initSigner();
  }

  private async initSigner() {
    const mnemonic = this.configService.get<string>('ICP_MNEMONIC');

    if (!mnemonic) {
      throw new Error('ICP_MNEMONIC is not configured');
    }

    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid ICP_MNEMONIC provided');
    }

    const seedBytes = bip39.mnemonicToSeedSync(mnemonic);
    const identitySeed = seedBytes.slice(0, 32);
    this.identity = Ed25519KeyIdentity.generate(identitySeed);

    this.legacyPrivateKey = identitySeed;
    this.legacyPublicKey = await ed25519.getPublicKeyAsync(this.legacyPrivateKey);

    const principal = this.identity.getPrincipal().toText();
    const publicKeyHex = this.bytesToHex(this.legacyPublicKey);

    console.log('[Signer] Coordinator initialized');
    console.log('[Signer] Principal:', principal);
    console.log('[Signer] Public Key:', publicKeyHex);
  }

  async signQuote(quote: any): Promise<Uint8Array> {
    const message = this.serializeQuote(quote);
    const signature = await ed25519.signAsync(message, this.legacyPrivateKey);
    return signature;
  }

  getIdentity(): Ed25519KeyIdentity {
    return this.identity;
  }

  getPrincipalText(): string {
    return this.identity.getPrincipal().toText();
  }

  getPrincipal() {
    return this.identity.getPrincipal();
  }

  getPublicKey(): Uint8Array {
    return this.legacyPublicKey;
  }

  getPublicKeyHex(): string {
    return this.bytesToHex(this.legacyPublicKey);
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
    console.log('[COORDINATOR SERIALIZE]', message);
    return new TextEncoder().encode(message);
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
