"use client";
import { Suspense, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

interface Props {
	reservationId: string;
}

function PaymentReturnHandlerInner({ reservationId }: Props) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const handledRef = useRef(false);

	useEffect(() => {
		const paymentStatus = searchParams.get("payment");
		if (!paymentStatus || handledRef.current) return;
		handledRef.current = true;

		const sessionId = searchParams.get("session_id");

		window.history.replaceState(null, "", pathname);

		if (paymentStatus === "success") {
			if (!sessionId) {
				router.refresh();
				return;
			}

			const toastId = toast.loading("Vérification du paiement…");

			fetch("/api/payments/verify-session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sessionId, reservationId }),
			})
				.then((r) => r.json())
				.then((d) => {
					if (d.status === "verified" || d.status === "already_paid") {
						toast.success("Paiement accepté ! Votre acompte a bien été reçu.", {
							id: toastId,
						});
					} else {
						toast(
							"Paiement en cours de confirmation par Stripe. Le statut sera mis à jour automatiquement.",
							{ id: toastId, icon: "⏳" }
						);
					}
				})
				.catch(() => {
					toast.error(
						"Impossible de vérifier le paiement pour le moment. Il sera confirmé automatiquement dès réception par Stripe.",
						{ id: toastId }
					);
				})
				.finally(() => {
					router.refresh();
				});
		} else if (paymentStatus === "canceled") {
			toast("Paiement annulé. Vous pouvez relancer le paiement à tout moment.", {
				icon: "ℹ️",
			});
		}
	}, [searchParams, reservationId, router, pathname]);

	return null;
}

export default function PaymentReturnHandler(props: Props) {
	return (
		<Suspense fallback={null}>
			<PaymentReturnHandlerInner {...props} />
		</Suspense>
	);
}
