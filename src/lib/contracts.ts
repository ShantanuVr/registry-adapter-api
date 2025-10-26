import { ethers } from 'ethers';
import { appConfig } from './config.js';

// ERC1155 ABI for CarbonCredit1155 contract - Updated to match actual contract signature
export const ERC1155_ABI = [
  'function mint(uint256 classId, address to, uint256 amount, (bytes32,uint64,uint64,bytes32,bytes32,string,bytes32,string))',
  'function retire(uint256 classId, address from, uint256 amount, (bytes32,bytes32,bytes32,string,bytes32,string))',
  'function balanceOf(address account, uint256 id) external view returns (uint256)',
  'function totalIssued(uint256 classId) external view returns (uint256)',
  'function totalRetired(uint256 classId) external view returns (uint256)',
  'function getClassInfo(uint256 classId) external view returns ((bytes32,uint64,uint64))',
  'event Issued(address indexed issuer, uint256 indexed classId, address indexed to, uint256 amount, (bytes32,uint64,uint64,bytes32,bytes32,string,bytes32,string))',
  'event Retired(address indexed operator, uint256 indexed classId, address indexed from, uint256 amount, (bytes32,bytes32,bytes32,string,bytes32,string))',
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
  offchainRef?: string;
  originClassId?: string;
  registryURI?: string;
}

export interface RetirementData {
  purposeHash: string;
  beneficiaryHash: string;
  certificateHash?: string;
  offchainRef?: string;
  originClassId?: string;
  registryURI?: string;
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

// Note: We now pass structs directly to contract functions instead of encoding

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
