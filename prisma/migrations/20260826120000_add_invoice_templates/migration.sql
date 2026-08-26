-- CreateTable
CREATE TABLE "invoice_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "cloudinaryUrl" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_templates_type_idx" ON "invoice_templates"("type");

-- CreateIndex
CREATE INDEX "invoice_templates_type_isActive_idx" ON "invoice_templates"("type", "isActive");

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "templateId" TEXT;

-- CreateIndex
CREATE INDEX "invoices_templateId_idx" ON "invoices"("templateId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "invoice_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
