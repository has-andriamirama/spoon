import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice } from "@/lib/utils";
import { Download, FileText } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Factures" };

export default async function AdminInvoicesPage() {
	const invoices = await prisma.invoice.findMany({
		include: { reservation: { select: { guestFirstName: true, guestLastName: true } } },
		orderBy: { issuedAt: "desc" },
		take: 100,
	});

	return (
		<div>
			<h1 className="font-display text-3xl text-[#F5F0EB] mb-6">Factures</h1>
			<div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
				{invoices.length === 0 ? (
					<div className="text-center py-16"><FileText size={40} className="text-[#333] mx-auto mb-4" /><p className="text-[#5A5249]">Aucune facture</p></div>
				) : (
					<table className="w-full">
						<thead><tr className="border-b border-[#222]">
							{["N° Facture","Client","Date","Montant","PDF"].map(h => <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-[#5A5249] uppercase tracking-wider">{h}</th>)}
						</tr></thead>
						<tbody className="divide-y divide-[#1a1a1a]">
							{invoices.map(inv => (
								<tr key={inv.id} className="hover:bg-[#1a1a1a] transition-colors">
									<td className="px-5 py-4 text-sm text-[#F5F0EB] font-mono font-medium">{inv.invoiceNumber}</td>
									<td className="px-5 py-4 text-sm text-[#9A8F84]">{inv.reservation.guestFirstName} {inv.reservation.guestLastName}</td>
									<td className="px-5 py-4 text-sm text-[#9A8F84]">{formatDate(inv.issuedAt, "dd/MM/yyyy")}</td>
									<td className="px-5 py-4 text-sm text-[#C8973A] font-semibold">{formatPrice(inv.totalAmount)}</td>
									<td className="px-5 py-4">
										{inv.pdfUrl ? (
											<a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#C8973A] hover:underline">
												<Download size={12} /> Télécharger
											</a>
										) : <span className="text-xs text-[#333]">—</span>}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}
