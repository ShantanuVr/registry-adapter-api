-- CreateTable
CREATE TABLE "token_maps" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "chain_id" TEXT NOT NULL,
    "contract_address" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_maps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "token_maps_class_id_key" ON "token_maps"("class_id");

-- CreateIndex
CREATE INDEX "token_maps_class_id_idx" ON "token_maps"("class_id");

-- CreateIndex
CREATE INDEX "token_maps_chain_id_idx" ON "token_maps"("chain_id");
