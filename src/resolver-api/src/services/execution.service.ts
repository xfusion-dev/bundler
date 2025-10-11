import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Principal } from '@dfinity/principal';
import { Icrc151Service } from './icrc151.service';
import { Icrc2Service } from './icrc2.service';
import { BackendService } from './backend.service';
import { IdentityService } from './identity.service';

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(
    private readonly icrc151Service: Icrc151Service,
    private readonly icrc2Service: Icrc2Service,
    private readonly backendService: BackendService,
    private readonly identityService: IdentityService,
    private readonly configService: ConfigService,
  ) {}

  async executeAssignment(requestId: number): Promise<void> {
    this.logger.log(`Starting execution for request ${requestId}`);

    const backendCanisterId = this.configService.get<string>('BACKEND_CANISTER_ID');
    if (!backendCanisterId) {
      throw new Error('BACKEND_CANISTER_ID not configured');
    }

    const transaction = await this.backendService.getTransaction(requestId);

    if ('Sell' in transaction.operation) {
      await this.executeSellAssignment(requestId);
    } else if ('Buy' in transaction.operation || 'InitialBuy' in transaction.operation) {
      await this.executeBuyAssignment(requestId);
    } else {
      throw new Error(`Unknown operation type: ${JSON.stringify(transaction.operation)}`);
    }
  }

  private async executeBuyAssignment(requestId: number): Promise<void> {
    this.logger.log(`Executing BUY assignment for request ${requestId}`);

    const backendCanisterId = this.configService.get<string>('BACKEND_CANISTER_ID');
    const assignment = await this.backendService.getAssignment(requestId);

    this.logger.log(`Assignment ${requestId}:`);
    this.logger.log(`  Resolver: ${assignment.resolver.toText()}`);
    this.logger.log(`  Asset amounts needed: ${JSON.stringify(assignment.asset_amounts, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )}`);
    this.logger.log(`  NAV tokens to mint: ${assignment.nav_tokens.toString()}`);

    const transaction = await this.backendService.getTransaction(requestId);
    const bundle = await this.backendService.getBundle(Number(transaction.bundle_id));

    const resolverPrincipal = this.identityService.getPrincipal();
    const backendPrincipal = Principal.fromText(backendCanisterId!);

    // Step 1: Check existing balances and mint only what's needed
    for (const assetAmount of assignment.asset_amounts) {
      const allocation = bundle.allocations.find(a => a.asset_id === assetAmount.asset_id);
      if (!allocation) {
        throw new Error(`Asset ${assetAmount.asset_id} not found in bundle allocations`);
      }

      if (!allocation.token_location || !('ICRC151' in allocation.token_location)) {
        throw new Error(`Asset ${assetAmount.asset_id} does not have ICRC151 token location`);
      }

      const { ledger, token_id } = allocation.token_location.ICRC151;
      const ledgerCanisterId = ledger.toText();
      const tokenIdBytes = new Uint8Array(token_id);
      const requestedAmount = BigInt(assetAmount.amount.toString());

      const metadata = await this.icrc151Service.getTokenMetadata(ledgerCanisterId, tokenIdBytes);
      const transferFee = metadata.fee;

      const totalNeeded = requestedAmount + transferFee;

      const currentBalance = await this.icrc151Service.getBalance(
        ledgerCanisterId,
        tokenIdBytes,
        resolverPrincipal,
      );

      this.logger.log(`Resolver has ${currentBalance} ${assetAmount.asset_id}, needs ${totalNeeded}`);

      if (currentBalance < totalNeeded) {
        const amountToMint = totalNeeded - currentBalance;
        this.logger.log(`Minting ${amountToMint} ${assetAmount.asset_id} to resolver...`);

        await this.icrc151Service.mintTokens(
          ledgerCanisterId,
          tokenIdBytes,
          resolverPrincipal,
          amountToMint,
          `Mint for request ${requestId}`,
        );

        this.logger.log(`✓ Minted ${amountToMint} ${assetAmount.asset_id}`);
      } else {
        this.logger.log(`✓ Using existing inventory (no minting needed for ${assetAmount.asset_id})`);
      }
    }

    // Step 2: Approve backend to spend tokens (requested amount + fee)
    for (const assetAmount of assignment.asset_amounts) {
      const allocation = bundle.allocations.find(a => a.asset_id === assetAmount.asset_id);
      const { ledger, token_id } = allocation.token_location.ICRC151;
      const ledgerCanisterId = ledger.toText();
      const tokenIdBytes = new Uint8Array(token_id);
      const requestedAmount = BigInt(assetAmount.amount.toString());

      // Get token metadata to check transfer fee
      const metadata = await this.icrc151Service.getTokenMetadata(ledgerCanisterId, tokenIdBytes);
      const transferFee = metadata.fee;

      // Approve the full amount including fee
      const totalToApprove = requestedAmount + transferFee;

      this.logger.log(`Approving backend to spend ${totalToApprove} ${assetAmount.asset_id} (${requestedAmount} + ${transferFee} fee)...`);

      await this.icrc151Service.approveTokens(
        ledgerCanisterId,
        tokenIdBytes,
        backendPrincipal,
        totalToApprove,
        `Approval for request ${requestId}`,
      );

      this.logger.log(`✓ Approved ${totalToApprove} ${assetAmount.asset_id}`);
    }

    // Step 3: Call backend's confirm_asset_deposit
    this.logger.log(`Calling backend confirm_asset_deposit for request ${requestId}...`);
    await this.backendService.confirmAssetDeposit(requestId);

    this.logger.log(`✓ Request ${requestId} complete! Backend pulled tokens and minted NAV tokens to user.`);
  }

  private async executeSellAssignment(requestId: number): Promise<void> {
    this.logger.log(`Executing SELL assignment for request ${requestId}`);

    const backendCanisterId = this.configService.get<string>('BACKEND_CANISTER_ID');
    const assignment = await this.backendService.getAssignment(requestId);

    this.logger.log(`Assignment ${requestId}:`);
    this.logger.log(`  Resolver: ${assignment.resolver.toText()}`);
    this.logger.log(`  ckUSDC amount to pay: ${assignment.ckusdc_amount.toString()}`);
    this.logger.log(`  NAV tokens user is selling: ${assignment.nav_tokens.toString()}`);
    this.logger.log(`  Fees: ${assignment.fees.toString()}`);

    const resolverPrincipal = this.identityService.getPrincipal();
    const backendPrincipal = Principal.fromText(backendCanisterId!);

    const ckusdcAmount = BigInt(assignment.ckusdc_amount.toString());
    const ckusdcFee = BigInt(10000);
    const totalApproval = ckusdcAmount + ckusdcFee;

    this.logger.log(`Checking resolver's ckUSDC balance...`);
    const resolverBalance = await this.icrc2Service.getBalance(resolverPrincipal);
    this.logger.log(`Resolver has ${resolverBalance} ckUSDC`);

    if (resolverBalance < totalApproval) {
      throw new Error(`Insufficient ckUSDC balance. Need ${totalApproval}, have ${resolverBalance}`);
    }

    this.logger.log(`Approving backend to pull ${totalApproval} ckUSDC (${ckusdcAmount} + ${ckusdcFee} fee)...`);
    const approvalTxId = await this.icrc2Service.approveSpender(
      backendPrincipal,
      totalApproval,
      `Approval for sell request ${requestId}`,
    );
    this.logger.log(`✓ Approved ${ckusdcAmount} ckUSDC (tx: ${approvalTxId})`);

    this.logger.log(`Calling backend confirm_resolver_payment_and_complete_sell for request ${requestId}...`);
    await this.backendService.confirmResolverPaymentAndCompleteSell(requestId);

    this.logger.log(`✓ Request ${requestId} complete! Backend pulled ckUSDC, paid user, and burned NAV tokens. Resolver will receive underlying assets.`);
  }
}
