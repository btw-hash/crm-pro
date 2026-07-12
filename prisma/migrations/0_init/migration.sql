-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "responsibleManagerId" TEXT NOT NULL,
    "ein" TEXT,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "barcode" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "responsibleManagerId" TEXT NOT NULL,
    "goal" TEXT,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "clientId" TEXT,
    "kind" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "dueDate" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_audits" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "equipment" TEXT[],
    "painPoints" TEXT[],
    "decisionMakers" JSONB NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_acts" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "clientName" TEXT,
    "equipment" TEXT,
    "productName" TEXT,
    "dosage" TEXT,
    "processParams" TEXT,
    "result" TEXT NOT NULL,
    "comment" TEXT,
    "confirmedBy" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_acts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sample_requests" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "assignedTechnologistId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sample_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_events" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT,

    CONSTRAINT "deal_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "dealId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_descriptions" (
    "productId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sourceUrl" TEXT,

    CONSTRAINT "product_descriptions_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "quotas" (
    "id" TEXT NOT NULL,
    "mopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodQuarter" INTEGER NOT NULL,
    "plannedVolume" DOUBLE PRECISION NOT NULL,
    "reservedVolume" DOUBLE PRECISION NOT NULL,
    "soldVolume" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "additional_orders" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "parentOrderNumber" TEXT NOT NULL,
    "lines" JSONB NOT NULL,
    "shipmentDate" TEXT NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,

    CONSTRAINT "additional_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboardings" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "ein" TEXT,
    "status" TEXT NOT NULL,
    "documents" JSONB NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "legalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboardings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packing_requests" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "productName" TEXT NOT NULL,
    "sourcePack" TEXT NOT NULL,
    "targetPack" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,

    CONSTRAINT "packing_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_items" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,

    CONSTRAINT "defect_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_claims" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "dealId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "comment" TEXT,
    "status" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lines" JSONB NOT NULL,
    "driver" TEXT,
    "scheduledDate" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tech_requests" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "productId" TEXT,
    "kind" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tech_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "activities_dealId_idx" ON "activities"("dealId");

-- CreateIndex
CREATE INDEX "activities_clientId_idx" ON "activities"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "production_audits_dealId_key" ON "production_audits"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "test_acts_dealId_key" ON "test_acts"("dealId");

-- CreateIndex
CREATE INDEX "sample_requests_dealId_idx" ON "sample_requests"("dealId");

-- CreateIndex
CREATE INDEX "deal_events_dealId_idx" ON "deal_events"("dealId");

-- CreateIndex
CREATE INDEX "notifications_recipientId_idx" ON "notifications"("recipientId");

-- CreateIndex
CREATE INDEX "contacts_clientId_idx" ON "contacts"("clientId");

-- CreateIndex
CREATE INDEX "quotas_mopId_idx" ON "quotas"("mopId");

-- CreateIndex
CREATE INDEX "additional_orders_shipmentDate_idx" ON "additional_orders"("shipmentDate");

-- CreateIndex
CREATE INDEX "additional_orders_parentOrderNumber_idx" ON "additional_orders"("parentOrderNumber");

-- CreateIndex
CREATE INDEX "return_claims_clientId_idx" ON "return_claims"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "shipments_managerId_idx" ON "shipments"("managerId");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("status");

-- CreateIndex
CREATE INDEX "tech_requests_status_idx" ON "tech_requests"("status");

-- CreateIndex
CREATE INDEX "tech_requests_assignedTo_idx" ON "tech_requests"("assignedTo");

-- CreateIndex
CREATE INDEX "tech_requests_dealId_idx" ON "tech_requests"("dealId");

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_audits" ADD CONSTRAINT "production_audits_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_acts" ADD CONSTRAINT "test_acts_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_requests" ADD CONSTRAINT "sample_requests_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_requests" ADD CONSTRAINT "sample_requests_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_events" ADD CONSTRAINT "deal_events_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

