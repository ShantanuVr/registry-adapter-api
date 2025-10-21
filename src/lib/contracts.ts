import { ethers } from 'ethers';
import { appConfig } from './config.js';

// ERC1155 ABI for CarbonCredit1155 contract
export const ERC1155_ABI = [
  'function mint(address to, uint256 id, uint256 amount, bytes calldata data) external',
  'function retire(uint256 id, uint256 amount, bytes calldata data) external',
  'function balanceOf(address account, uint256 id) external view returns (uint256)',
  'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external',
  'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
  'event Retirement(address indexed account, uint256 indexed id, uint256 amount, bytes data)',
] as const;

// EvidenceAnchor ABI
export const EVIDENCE_ANCHOR_ABI = [
  'function anchor(bytes32 topic, bytes32 hash, string calldata uri) external',
  'event Anchored(bytes32 indexed topic, bytes32 indexed hash, string uri, uint256 timestamp)',
] as const;

export interface IssuanceData {
  projectIdHash: string;
  vintageStart: number;
  vintageEnd: number;
  factorRefHash: string;
  issuanceEvidence: string;
}

export interface RetirementData {
  purposeHash: string;
  beneficiaryHash: string;
  offchainRef?: string;
}

export const createCarbonCreditContract = (provider: ethers.Provider) => {
  return new ethers.Contract(
    appConfig.TOKENS_CREDIT1155_ADDR,
    ERC1155_ABI,
    provider
  );
};

export const createEvidenceAnchorContract = (provider: ethers.Provider) => {
  return new ethers.Contract(
    appConfig.EVIDENCE_ANCHOR_ADDR,
    EVIDENCE_ANCHOR_ABI,
    provider
  );
};

export const encodeIssuanceData = (data: IssuanceData): string => {
  // Encode issuance data as bytes for contract call
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'uint256', 'uint256', 'bytes32', 'bytes32'],
    [
      data.projectIdHash,
      data.vintageStart,
      data.vintageEnd,
      data.factorRefHash,
      data.issuanceEvidence,
    ]
  );
  return encoded;
};

export const encodeRetirementData = (data: RetirementData): string => {
  // Encode retirement data as bytes for contract call
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'bytes32', 'string'],
    [
      data.purposeHash,
      data.beneficiaryHash,
      data.offchainRef || '',
    ]
  );
  return encoded;
};

export const hashProjectId = (projectId: string): string => {
  return ethers.keccak256(ethers.toUtf8Bytes(projectId));
};

export const hashFactorRef = (factorRef: string): string => {
  return ethers.keccak256(ethers.toUtf8Bytes(factorRef));
};

export const hashPurpose = (purpose: string): string => {
  return ethers.keccak256(ethers.toUtf8Bytes(purpose));
};

export const hashBeneficiary = (beneficiary: string): string => {
  return ethers.keccak256(ethers.toUtf8Bytes(beneficiary));
};

export const createMerkleRoot = (evidenceHashes: string[]): string => {
  if (evidenceHashes.length === 0) {
    return ethers.ZeroHash;
  }
  
  if (evidenceHashes.length === 1) {
    return evidenceHashes[0];
  }
  
  // Simple merkle tree implementation
  let currentLevel = evidenceHashes.map(hash => ethers.keccak256(hash));
  
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1] || left;
      nextLevel.push(ethers.keccak256(left + right.slice(2)));
    }
    currentLevel = nextLevel;
  }
  
  return currentLevel[0];
};

export const validateAddress = (address: string): boolean => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

export const validateHexString = (hex: string, length?: number): boolean => {
  try {
    if (!hex.startsWith('0x')) return false;
    if (length && hex.length !== length + 2) return false;
    ethers.getBytes(hex);
    return true;
  } catch {
    return false;
  }
};
