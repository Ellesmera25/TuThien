import { createHash } from "crypto";

export type BlockchainRecord = {
  hash: string;
  paymentReference: string;
  amount: number;
  donorName: string;
  email: string;
  timestamp: number;
  previousHash: string;
};

/**
 * Create a blockchain hash for a donation
 * Hash = SHA256(paymentReference + amount + email + donorName + timestamp + previousHash)
 * Each block links to the previous block, creating an immutable chain
 */
export function createBlockchainHash(data: {
  paymentReference: string;
  amount: number;
  email: string;
  donorName: string;
  timestamp?: number;
  previousHash: string;
}): string {
  const timestamp = data.timestamp || Date.now();
  const dataString = `${data.paymentReference}|${data.amount}|${data.email}|${data.donorName}|${timestamp}|${data.previousHash}`;
  return createHash("sha256").update(dataString).digest("hex");
}

/**
 * Create a blockchain record for donation verification
 * Requires previousHash to maintain chain integrity
 */
export function createBlockchainRecord(
  paymentReference: string,
  amount: number,
  donorName: string,
  email: string,
  previousHash: string,
): BlockchainRecord {
  const timestamp = Date.now();
  const hash = createBlockchainHash({
    paymentReference,
    amount,
    email,
    donorName,
    timestamp,
    previousHash,
  });

  return {
    hash,
    paymentReference,
    amount,
    donorName,
    email,
    timestamp,
    previousHash,
  };
}

/**
 * Verify blockchain record integrity
 * Checks that the hash matches the calculated hash from data + previousHash
 */
export function verifyBlockchainRecord(record: BlockchainRecord): boolean {
  const recalculatedHash = createBlockchainHash({
    paymentReference: record.paymentReference,
    amount: record.amount,
    email: record.email,
    donorName: record.donorName,
    timestamp: record.timestamp,
    previousHash: record.previousHash,
  });

  return recalculatedHash === record.hash;
}

/**
 * Verify entire blockchain chain from genesis block
 * Returns the last valid hash, or null if chain is broken
 */
export function verifyBlockchainChain(
  records: BlockchainRecord[],
  genesisBlockHash: string,
): boolean {
  if (records.length === 0) {
    return true;
  }

  // First record must link to genesis block
  if (records[0].previousHash !== genesisBlockHash) {
    return false;
  }

  // Verify each record and chain linkage
  for (let i = 0; i < records.length; i++) {
    if (!verifyBlockchainRecord(records[i])) {
      return false;
    }

    // Check chain linkage
    if (i > 0 && records[i].previousHash !== records[i - 1].hash) {
      return false;
    }
  }

  return true;
}

/**
 * Get the genesis block hash
 * Used as the starting point for the blockchain
 */
export function getGenesisBlockHash(): string {
  return createHash("sha256").update("GENESIS_BLOCK_TUTHIEN_DONATIONS").digest("hex");
}
