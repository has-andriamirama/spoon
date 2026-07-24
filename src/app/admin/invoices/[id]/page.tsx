import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatDate, formatPrice } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminInvoiceDetailPage({ params }: { params: { id: string } }) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { reservation: true },
  });
  if (!invoice) notFound();

  return (
    <div>
      <Link href="/admin/invoices" className="inline-flex items-center gap-2 text-sm text-[#9A8F84] hover:text-[#F5F0EB] mb-6 transition-colors"><ArrowLeft size={16} /> Retour</Link>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl text-[#F5F0EB]">Facture {invoice.invoiceNumber}</h1>
        {invoice.pdfUrl && (
          <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
            <Download size={16} /> Télécharger PDF
          </a>
        )}
      </div>
      <div className="bg-[#141414] border border-[#222] rounded-xl p-6 max-w-lg">
        <dl className="space-y-4">
          {[
            { label: "N° Facture", value: invoice.invoiceNumber },
            { label: "Client", value: `${invoice.reservation.guestFirstName} ${invoice.reservation.guestLastName}` },
            { label: "Email", value: invoice.guestEmail },
            { label: "Date d'émission", value: formatDate(invoice.issuedAt) },
            { label: "Montant HT", value: formatPrice(invoice.amount) },
            { label: "TVA", value: formatPrice(invoice.taxAmount) },
            { label: "Total TTC", value: formatPrice(invoice.totalAmount) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between border-b border-[#1a1a1a] pb-3 last:border-0">
              <dt className="text-sm text-[#5A5249]">{label}</dt>
              <dd className="text-sm text-[#F5F0EB] font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
