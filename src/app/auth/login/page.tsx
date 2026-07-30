"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { UtensilsCrossed, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

function LoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(false);
	const [showPw, setShowPw] = useState(false);
	const [form, setForm] = useState({ email: "", password: "" });
	const callbackUrl = searchParams.get("callbackUrl") || "/account/reservations";

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault(); setLoading(true);
		try {
			const res = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
			if (res?.error) throw new Error("Email ou mot de passe incorrect");
			toast.success("Connexion réussie !");
			router.push(callbackUrl);
		} catch (err: any) { toast.error(err.message); }
		finally { setLoading(false); }
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
				<div className="bg-[#141414] border border-[#222] rounded-xl p-6 sm:p-8">
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						<Input label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} autoComplete="email" required />
						<div className="relative">
							<Input label="Mot de passe" type={showPw ? "text" : "password"} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} autoComplete="current-password" required />
							<button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-8 text-[#5A5249] hover:text-[#9A8F84]">
								{showPw ? <EyeOff size={16} /> : <Eye size={16} />}
							</button>
						</div>
						<div className="flex justify-end">
							<Link href="/auth/forgot-password" className="text-xs text-[#C8973A] hover:underline">Mot de passe oublié ?</Link>
						</div>
						<Button type="submit" loading={loading} className="w-full mt-2">Se connecter</Button>
					</form>
					<p className="text-sm text-center text-[#5A5249] mt-6">
						Pas encore de compte ?{" "}
						<Link href="/auth/register" className="text-[#C8973A] hover:underline">S&apos;inscrire</Link>
					</p>
				</div>
			</div>
		</div>
	);
}

export default function LoginPage() {
	return <Suspense><LoginForm /></Suspense>;
}
