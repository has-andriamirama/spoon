import Link from "next/link";

export default function NotFound() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] px-4">
			<div className="text-center">
				<p className="text-[#C8973A] font-display text-8xl font-light mb-4">404</p>
				<h1 className="text-2xl font-display text-[#F5F0EB] mb-4">Page introuvable</h1>
				<p className="text-[#9A8F84] mb-8">Cette page n&apos;existe pas ou a été déplacée.</p>
				<Link
					href="/"
					className="inline-flex items-center gap-2 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold px-6 py-3 rounded-lg transition-colors"
				>
					Retour à l&apos;accueil
				</Link>
			</div>
		</div>
	);
}
