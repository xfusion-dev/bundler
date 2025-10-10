import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Principal } from '@dfinity/principal';
import { Icrc151Service } from './icrc151.service';
import { BackendService } from './backend.service';
import { IdentityService } from './identity.service';

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(
    private readonly icrc151Service: Icrc151Service,
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

    // Get assignment to find out what assets and amounts are needed
    const assignment = await this.backendService.getAssignment(requestId);

    this.logger.log(`Assignment ${requestId}:`);
    this.logger.log(`  Resolver: ${assignment.resolver.toText()}`);
    this.logger.log(`  Asset amounts needed: ${JSON.stringify(assignment.asset_amounts, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )}`);
    this.logger.log(`  NAV tokens to mint: ${assignment.nav_tokens.toString()}`);

    // Get bundle to find token locations
    const transaction = await this.backendService.getTransaction(requestId);
    const bundle = await this.backendService.getBundle(Number(transaction.bundle_id));

    const resolverPrincipal = this.identityService.getPrincipal();
    const backendPrincipal = Principal.fromText(backendCanisterId);

    // Step 1: Mint required tokens to resolver (based on assignment amounts + transfer fee)
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

      // Get token metadata to check transfer fee
      const metadata = await this.icrc151Service.getTokenMetadata(ledgerCanisterId, tokenIdBytes);
      const transferFee = metadata.fee;

      // Mint requested amount + transfer fee so backend can successfully pull via transfer_from
      const totalToMint = requestedAmount + transferFee;

      this.logger.log(`Minting ${totalToMint} ${assetAmount.asset_id} to resolver (${requestedAmount} + ${transferFee} fee)...`);

      await this.icrc151Service.mintTokens(
        ledgerCanisterId,
        tokenIdBytes,
        resolverPrincipal,
        totalToMint,
        `Mint for request ${requestId}`,
      );

      this.logger.log(`✓ Minted ${totalToMint} ${assetAmount.asset_id}`);
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
}
