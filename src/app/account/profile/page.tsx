"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/utils";

export default function ProfilePage() {
	const { data: session, update } = useSession();
	const user = session?.user;
	const [loading, setLoading] = useState(false);
	const [form, setForm] = useState({ firstName: user?.firstName || "", lastName: user?.lastName || "", phone: user?.phone || "" });
	const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
	const [pwLoading, setPwLoading] = useState(false);

	const handleProfileSave = async (e: React.FormEvent) => {
		e.preventDefault(); setLoading(true);
		try {
			const res = await fetch("/api/customers/" + user?.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
			if (!res.ok) throw new Error();
			await update();
			toast.success("Profil mis à jour !");
		} catch { toast.error("Erreur lors de la mise à jour."); }
		finally { setLoading(false); }
	};

	const handlePwChange = async (e: React.FormEvent) => {
		e.preventDefault();
		if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error("Mots de passe non identiques"); return; }
		if (pwForm.newPassword.length < 8) { toast.error("Minimum 8 caractères"); return; }
		setPwLoading(true);
		try {
			const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user?.id, ...pwForm }) });
			if (!res.ok) throw new Error((await res.json()).error);
			toast.success("Mot de passe modifié !");
			setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
		} catch (error: unknown) { toast.error(getErrorMessage(error)); }
		finally { setPwLoading(false); }
	};

	return (
		<div>
			<h1 className="font-display text-3xl text-[#F5F0EB] mb-8">Mon profil</h1>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<form onSubmit={handleProfileSave} className="bg-[#141414] border border-[#222] rounded-xl p-6">
					<h2 className="font-display text-xl text-[#F5F0EB] mb-5">Informations personnelles</h2>
					<div className="flex flex-col gap-4">
						<div className="grid grid-cols-2 gap-3">
							<Input label="Prénom" value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} />
							<Input label="Nom" value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} />
						</div>
						<Input label="Email" value={user?.email || ""} disabled hint="L'email ne peut pas être modifié" />
						<Input label="Téléphone" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
						<Button type="submit" loading={loading}>Enregistrer les modifications</Button>
					</div>
				</form>
				<form onSubmit={handlePwChange} className="bg-[#141414] border border-[#222] rounded-xl p-6">
					<h2 className="font-display text-xl text-[#F5F0EB] mb-5">Changer le mot de passe</h2>
					<div className="flex flex-col gap-4">
						<Input label="Mot de passe actuel" type="password" value={pwForm.currentPassword} onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))} />
						<Input label="Nouveau mot de passe" type="password" value={pwForm.newPassword} onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))} hint="Minimum 8 caractères" />
						<Input label="Confirmer le nouveau mot de passe" type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))} />
						<Button type="submit" loading={pwLoading}>Modifier le mot de passe</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
