import { ethers } from 'ethers';
import { appConfig } from './config.js';
import logger from './logger.js';
import { AppError, ErrorCode } from './errors.js';

export interface ChainProvider {
  provider: ethers.JsonRpcProvider;
  signer: ethers.Wallet;
  network: ethers.Network;
}

let chainProvider: ChainProvider | null = null;

export const initializeChainProvider = async (): Promise<ChainProvider> => {
  try {
    const provider = new ethers.JsonRpcProvider(appConfig.CHAIN_RPC_URL);
    const network = await provider.getNetwork();
    
    if (Number(network.chainId) !== appConfig.CHAIN_ID) {
      throw new AppError(
        ErrorCode.CHAIN_UNAVAILABLE,
        `Expected chain ID ${appConfig.CHAIN_ID}, got ${network.chainId}`,
        500
      );
    }

    const signer = new ethers.Wallet(appConfig.SIGNER_PRIV, provider);
    const signerAddress = await signer.getAddress();

    logger.info({
      chainId: network.chainId,
      signerAddress,
      rpcUrl: appConfig.CHAIN_RPC_URL,
    }, 'Chain provider initialized');

    chainProvider = {
      provider,
      signer,
      network,
    };

    return chainProvider;
  } catch (error) {
    logger.error({ error }, 'Failed to initialize chain provider');
    throw new AppError(
      ErrorCode.CHAIN_UNAVAILABLE,
      'Failed to connect to blockchain',
      500
    );
  }
};

export const getChainProvider = (): ChainProvider => {
  if (!chainProvider) {
    throw new AppError(
      ErrorCode.CHAIN_UNAVAILABLE,
      'Chain provider not initialized',
      500
    );
  }
  return chainProvider;
};

export const getSignerAddress = async (): Promise<string> => {
  const { signer } = getChainProvider();
  return await signer.getAddress();
};

export const getSignerRoles = async (): Promise<string[]> => {
  // In a real implementation, this would check the signer's roles on-chain
  // For demo purposes, return all roles
  return ['ISSUER', 'BURNER', 'EVIDENCE'];
};

export interface TransactionResult {
  txHash: string;
  blockNumber: number;
  gasUsed: bigint;
  onchainHash?: string;
}

export const sendTransaction = async (
  transaction: ethers.TransactionRequest,
  maxRetries: number = 3
): Promise<TransactionResult> => {
  const { signer } = getChainProvider();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info({
        attempt,
        to: transaction.to,
        value: transaction.value?.toString(),
        gasLimit: transaction.gasLimit?.toString(),
      }, 'Sending transaction');

      const tx = await signer.sendTransaction(transaction);
      logger.info({ txHash: tx.hash }, 'Transaction sent');

      const receipt = await tx.wait(appConfig.CONFIRMATIONS);
      
      if (!receipt) {
        throw new AppError(
          ErrorCode.TX_TIMEOUT,
          'Transaction receipt not found',
          500
        );
      }

      logger.info({
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
      }, 'Transaction confirmed');

      if (receipt.status === 0) {
        throw new AppError(
          ErrorCode.TX_REVERTED,
          'Transaction reverted',
          500
        );
      }

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        onchainHash: generateOnchainHash(receipt),
      };
    } catch (error) {
      logger.error({ attempt, error }, 'Transaction attempt failed');
      
      if (attempt === maxRetries) {
        if (error instanceof AppError) {
          throw error;
        }
        throw new AppError(
          ErrorCode.TX_REVERTED,
          `Transaction failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          500
        );
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw new AppError(ErrorCode.TX_REVERTED, 'Transaction failed', 500);
};

const generateOnchainHash = (receipt: ethers.TransactionReceipt): string => {
  // Generate deterministic hash from transaction data
  // This could be based on logs, calldata, or other transaction-specific data
  const data = `${receipt.hash}-${receipt.blockNumber}-${receipt.gasUsed}`;
  return ethers.keccak256(ethers.toUtf8Bytes(data));
};

export const getTransactionReceipt = async (txHash: string): Promise<ethers.TransactionReceipt | null> => {
  const { provider } = getChainProvider();
  return await provider.getTransactionReceipt(txHash);
};

export const getBalance = async (address: string, tokenId?: string): Promise<bigint> => {
  const { provider } = getChainProvider();
  
  if (tokenId) {
    // ERC1155 balance check - would need contract instance
    // For now, return mock balance
    return BigInt(1000);
  }
  
  return await provider.getBalance(address);
};
