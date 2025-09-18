import { Controller, Get, Post, HttpException, HttpStatus } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('status')
  async getWalletStatus() {
    try {
      const status = await this.walletService.getWalletStatus();
      return status;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get wallet status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('balances')
  async getBalances() {
    try {
      const balances = await this.walletService.getBalances();
      return { balances };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get balances',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('approvals')
  async getApprovals() {
    try {
      const approvals = await this.walletService.checkApprovals();
      return { approvals };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to check approvals',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('setup')
  async setupWallet() {
    try {
      await this.walletService.setupAllApprovals();
      const status = await this.walletService.getWalletStatus();
      return {
        success: true,
        message: 'Wallet setup completed',
        status,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to setup wallet',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('principal')
  async getPrincipal() {
    return {
      principal: this.walletService.getResolverPrincipal(),
    };
  }
}