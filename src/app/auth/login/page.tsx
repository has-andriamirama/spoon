"use client";
import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { UtensilsCrossed, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/utils";

function LoginForm() {
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(false);
	const [showPw, setShowPw] = useState(false);
	const [form, setForm] = useState({ email: "", password: "" });

	const callbackUrl = searchParams.get("callbackUrl") || "/account/reservations";

	const verified = searchParams.get("verified");
	const emailError = searchParams.get("error");

	useEffect(() => {
		if (verified === "1") {
			toast.success("Email vérifié ! Vous pouvez maintenant vous connecter.");
		}
		if (emailError === "token_expire") {
			toast.error("Le lien de vérification a expiré. Reconnectez-vous pour en recevoir un nouveau.");
		}
		if (emailError === "token_invalide") {
			toast.error("Lien de vérification invalide.");
		}
	}, [verified, emailError]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			const res = await signIn("credentials", {
				email: form.email,
				password: form.password,
				redirect: false,
			});

			if (res?.error || !res?.ok) {
				throw new Error("Email ou mot de passe incorrect");
			}

			toast.success("Connexion réussie !");

			window.location.href = callbackUrl;
		} catch (error: unknown) {
			toast.error(getErrorMessage(error));
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center px-4 bg-[#0A0A0A]">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<Link href="/" className="inline-flex items-center gap-2 mb-6">
						<div className="w-10 h-10 bg-[#C8973A] rounded-full flex items-center justify-center">
							<UtensilsCrossed size={18} className="text-[#0A0A0A]" />
						</div>
						<span className="font-display text-3xl text-[#F5F0EB] font-semibold">Spoon</span>
					</Link>
					<h1 className="font-display text-2xl text-[#F5F0EB]">Connexion à votre compte</h1>
				</div>

				{verified === "1" && (
					<div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
						<CheckCircle size={16} className="text-green-400 shrink-0" />
						<p className="text-sm text-green-400">
							Votre email a été vérifié. Vous pouvez maintenant vous connecter.
						</p>
					</div>
				)}

				{emailError && emailError !== "" && (
					<div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
						<AlertCircle size={16} className="text-red-400 shrink-0" />
						<p className="text-sm text-red-400">
							{emailError === "token_expire"
								? "Le lien de vérification a expiré."
								: "Lien de vérification invalide ou déjà utilisé."}
						</p>
					</div>
				)}

				<div className="bg-[#141414] border border-[#222] rounded-xl p-6 sm:p-8">
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						<Input
							label="Email"
							type="email"
							value={form.email}
							onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
							autoComplete="email"
							required
						/>
						<div className="relative">
							<Input
								label="Mot de passe"
								type={showPw ? "text" : "password"}
								value={form.password}
								onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
								autoComplete="current-password"
								required
							/>
							<button
								type="button"
								onClick={() => setShowPw((p) => !p)}
								className="absolute right-3 top-8 text-[#5A5249] hover:text-[#9A8F84]"
							>
								{showPw ? <EyeOff size={16} /> : <Eye size={16} />}
							</button>
						</div>
						<div className="flex justify-end">
							<Link
								href="/auth/forgot-password"
								className="text-xs text-[#C8973A] hover:underline"
							>
								Mot de passe oublié ?
							</Link>
						</div>
						<Button type="submit" loading={loading} className="w-full mt-2">
							Se connecter
						</Button>
					</form>
					<p className="text-sm text-center text-[#5A5249] mt-6">
						Pas encore de compte ?{" "}
						<Link href="/auth/register" className="text-[#C8973A] hover:underline">
							S&apos;inscrire
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}

export default function LoginPage() {
	return (
		<Suspense>
			<LoginForm />
		</Suspense>
	);
}
