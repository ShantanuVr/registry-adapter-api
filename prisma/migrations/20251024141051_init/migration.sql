-- CreateEnum
CREATE TYPE "ReceiptType" AS ENUM ('MINT', 'RETIRE', 'ANCHOR', 'TRANSFER');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('PENDING', 'MINED', 'FAILED');

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "type" "ReceiptType" NOT NULL,
    "classId" TEXT,
    "projectId" TEXT,
    "orgId" TEXT,
    "quantity" INTEGER,
    "factorRef" TEXT,
    "paramsJson" JSONB NOT NULL,
    "txHash" TEXT,
    "blockNumber" INTEGER,
    "onchainHash" TEXT,
    "status" "TxStatus" NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_maps" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "vintageStart" TIMESTAMP(3) NOT NULL,
    "vintageEnd" TIMESTAMP(3) NOT NULL,
    "classId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency" (
    "key" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "bodyHash" TEXT NOT NULL,
    "orgId" TEXT,
    "receiptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "actorSub" TEXT,
    "actorOrgId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "receipts_idempotencyKey_key" ON "receipts"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "class_maps_classId_key" ON "class_maps"("classId");
