import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { HttpAgent } from '@dfinity/agent';
import * as bip39 from 'bip39';

@Injectable()
export class IdentityService implements OnModuleInit {
  private identity: Ed25519KeyIdentity;
  private agent: HttpAgent;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initIdentity();
  }

  private async initIdentity() {
    const mnemonic = this.configService.get<string>('ICP_MNEMONIC');
    const network = this.configService.get<string>('ICP_NETWORK') || 'local';
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    if (!mnemonic) {
      throw new Error('ICP_MNEMONIC is not configured in .env file');
    }

    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid ICP_MNEMONIC provided');
    }

    const seedBytes = bip39.mnemonicToSeedSync(mnemonic);
    const identitySeed = seedBytes.slice(0, 32);
    this.identity = Ed25519KeyIdentity.generate(identitySeed);

    const host = network === 'local' ? 'http://127.0.0.1:4943' : 'https://icp-api.io';

    this.agent = new HttpAgent({
      host,
      identity: this.identity,
    });

    if (network === 'local' && !isProduction) {
      await this.agent.fetchRootKey();
    }

    const principal = this.identity.getPrincipal().toText();
    console.log('[Identity] Resolver initialized');
    console.log('[Identity] Principal:', principal);
    console.log('[Identity] Network:', network);
  }

  getIdentity(): Ed25519KeyIdentity {
    return this.identity;
  }

  getAgent(): HttpAgent {
    return this.agent;
  }

  getPrincipalText(): string {
    return this.identity.getPrincipal().toText();
  }

  getPrincipal() {
    return this.identity.getPrincipal();
  }
}
