import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { generateAdditionInvoice } from "@/services/invoice.service";
import { sendAdditionReceipt } from "@/services/email.service";

export const dynamic = "force-dynamic";
// La génération du PDF de facture d'addition (Puppeteer + Chromium) peut
// dépasser le timeout par défaut d'une fonction Vercel — voir le même
// commentaire dans /api/webhooks/stripe/route.ts.
export const maxDuration = 60;
export const runtime = "nodejs";

// POST — encaisser le paiement d'une commande
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const body = await request.json();
		const { paymentMethod } = body;

		const validMethods = ["CB", "ESPECES", "CHEQUE", "TICKET_RESTO"];
		if (!paymentMethod || !validMethods.includes(paymentMethod)) {
			return NextResponse.json(
				{ error: `Mode de paiement invalide. Valeurs acceptées : ${validMethods.join(", ")}` },
				{ status: 400 }
			);
		}

		const order = await prisma.serviceOrder.findUnique({
			where: { id },
			include: {
				items: { select: { totalPrice: true } },
				reservation: { select: { id: true } },
			},
		});

		if (!order) {
			return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
		}
		if (order.status === "PAYEE") {
			return NextResponse.json({ error: "Cette commande est déjà payée" }, { status: 400 });
		}
		if (order.status === "ANNULEE") {
			return NextResponse.json({ error: "Cette commande est annulée" }, { status: 400 });
		}

		// Recalculer le total pour s'assurer de la cohérence
		const finalTotal = order.items.reduce((s, i) => s + i.totalPrice, 0);

		// Transaction pour garantir l'atomicité
		const [updatedOrder] = await prisma.$transaction([
			// 1. Marquer la commande comme payée
			prisma.serviceOrder.update({
				where: { id },
				data: {
					status:        "PAYEE",
					paymentMethod,
					totalAmount:   finalTotal,
					closedAt:      new Date(),
				},
				include: {
					table: {
						select: { id: true, numero: true, zone: true, capaciteMax: true, description: true },
					},
					reservation: {
						select: { id: true, timeSlot: true, guestFirstName: true, guestLastName: true, guestEmail: true },
					},
					items: { orderBy: { createdAt: "asc" } },
				},
			}),

			// 2. Si c'est une réservation, la marquer comme terminée
			...(order.reservationId
				? [
						prisma.reservation.update({
							where: { id: order.reservationId },
							data: {
								status:      "COMPLETED",
								completedAt: new Date(),
							},
						}),
					]
				: []),
		]);

		// Notification temps réel
		await pusherServer.trigger("admin-reservations", "service-order-updated", {
			tableId: order.tableId,
			orderId:  id,
			action:   "paid",
		});

		// Notification admin
		await prisma.adminNotification.create({
			data: {
				type:    "service_paid",
				title:   "Paiement encaissé",
				message: `T${(updatedOrder as typeof updatedOrder & { table: { numero: number } }).table.numero} · ${order.guestName} · ${finalTotal.toFixed(2)} € (${paymentMethod})`,
				link:    `/admin/reservations/plan`,
			},
		});

		// Facture d'addition — un ServiceOrder encaissé génère toujours sa propre facture,
		// liée 1:1 à ce ServiceOrder (indépendante d'une éventuelle facture d'acompte).
		let invoiceNumber: string | undefined;
		try {
			const invoice = await generateAdditionInvoice(id);
			invoiceNumber = invoice.invoiceNumber;
		} catch (err) {
			console.error("[POST /api/admin/service-orders/[id]/payer] Erreur génération facture :", err);
		}

		const guestEmail = updatedOrder.reservation?.guestEmail;
		if (invoiceNumber && guestEmail) {
			sendAdditionReceipt({
				guestFirstName: updatedOrder.reservation?.guestFirstName ?? order.guestName,
				guestEmail,
				amount: finalTotal,
				paymentMethod,
				invoiceNumber,
			}).catch((err) => {
				console.error("[POST /api/admin/service-orders/[id]/payer] Erreur envoi reçu :", err);
			});
		}

		return NextResponse.json({ data: updatedOrder });
	} catch (error) {
		console.error("[POST /api/admin/service-orders/[id]/payer]", error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
