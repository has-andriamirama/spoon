"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

export default function CookieBanner() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const consent = localStorage.getItem("cookie-consent");
		if (!consent) setVisible(true);
	}, []);

	const accept = () => {
		localStorage.setItem("cookie-consent", "accepted");
		setVisible(false);
	};

	const decline = () => {
		localStorage.setItem("cookie-consent", "declined");
		setVisible(false);
	};

	if (!visible) return null;

	return (
		<div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
			<div className="max-w-2xl mx-auto bg-[#141414] border border-[#222] rounded-xl p-5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
				<Cookie size={20} className="text-[#C8973A] shrink-0 mt-0.5 sm:mt-0" />
				<p className="text-sm text-[#9A8F84] flex-1">
					Nous utilisons des cookies pour améliorer votre expérience. En continuant, vous acceptez notre{" "}
					<Link href="/legal/cookies" className="text-[#C8973A] hover:underline">politique de cookies</Link>.
				</p>
				<div className="flex items-center gap-3 shrink-0">
					<Button variant="ghost" size="sm" onClick={decline}>Refuser</Button>
					<Button variant="primary" size="sm" onClick={accept}>Accepter</Button>
				</div>
			</div>
		</div>
	);
}
