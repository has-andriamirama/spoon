"use client";
import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed } from "lucide-react";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault(); setLoading(true);
		try {
			await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
			setSent(true);
		} catch { toast.error("Erreur"); }
		finally { setLoading(false); }
	};

	return (
		<div className="min-h-screen flex items-center justify-center px-4 bg-[#0A0A0A]">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<Link href="/" className="inline-flex items-center gap-2 mb-6">
						<div className="w-10 h-10 bg-[#C8973A] rounded-full flex items-center justify-center"><UtensilsCrossed size={18} className="text-[#0A0A0A]" /></div>
						<span className="font-display text-3xl text-[#F5F0EB] font-semibold">Spoon</span>
					</Link>
					<h1 className="font-display text-2xl text-[#F5F0EB]">Mot de passe oublié</h1>
				</div>
				<div className="bg-[#141414] border border-[#222] rounded-xl p-6 sm:p-8">
					{sent ? (
						<div className="text-center py-4">
							<p className="text-green-400 mb-2 font-medium">Email envoyé !</p>
							<p className="text-[#9A8F84] text-sm mb-6">Vérifiez votre boîte email pour réinitialiser votre mot de passe. Le lien expire dans 1 heure.</p>
							<Link href="/auth/login" className="text-[#C8973A] hover:underline text-sm">Retour à la connexion</Link>
						</div>
					) : (
						<form onSubmit={handleSubmit} className="flex flex-col gap-4">
							<p className="text-sm text-[#9A8F84]">Entrez votre adresse email et nous vous enverrons un lien de réinitialisation.</p>
							<Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
							<Button type="submit" loading={loading} className="w-full">Envoyer le lien</Button>
							<Link href="/auth/login" className="text-center text-sm text-[#5A5249] hover:text-[#9A8F84]">Retour à la connexion</Link>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}
