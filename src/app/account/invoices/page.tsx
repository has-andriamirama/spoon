import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDate, formatPrice } from "@/lib/utils";
import { FileText, Download } from "lucide-react";

export const metadata = { title: "Mes factures" };

export default async function AccountInvoicesPage() {
	const session = await getServerSession(authOptions);
	if (!session) redirect("/auth/login");
	const invoices = await prisma.invoice.findMany({ where: { userId: session.user.id }, orderBy: { issuedAt: "desc" } });

	return (
		<div>
			<h1 className="font-display text-3xl text-[#F5F0EB] mb-8">Mes factures</h1>
			{invoices.length === 0 ? (
				<div className="bg-[#141414] border border-[#222] rounded-xl p-12 text-center">
					<FileText size={40} className="text-[#333] mx-auto mb-4" /><p className="text-[#9A8F84]">Aucune facture disponible.</p>
				</div>
			) : (
				<div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
					<table className="w-full">
						<thead><tr className="border-b border-[#222]">
							{["N° Facture","Date","Montant",""].map(h => <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-[#5A5249] uppercase tracking-wider">{h}</th>)}
						</tr></thead>
						<tbody className="divide-y divide-[#1a1a1a]">
							{invoices.map(inv => (
								<tr key={inv.id} className="hover:bg-[#1a1a1a] transition-colors">
									<td className="px-5 py-4 text-sm text-[#F5F0EB] font-medium font-mono">{inv.invoiceNumber}</td>
									<td className="px-5 py-4 text-sm text-[#9A8F84]">{formatDate(inv.issuedAt)}</td>
									<td className="px-5 py-4 text-sm text-[#C8973A] font-semibold">{formatPrice(inv.totalAmount)}</td>
									<td className="px-5 py-4">
										{inv.pdfUrl ? <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[#C8973A] hover:underline"><Download size={12} /> PDF</a> : <span className="text-xs text-[#333]">—</span>}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
