import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AccountSidebar from "@/components/account/account-sidebar";
import PublicHeader from "@/components/layout/public-header";
import PublicFooter from "@/components/layout/public-footer";
import CookieBanner from "@/components/layout/cookie-banner";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
	const session = await getServerSession(authOptions);
	if (!session) redirect("/auth/login?callbackUrl=/account/reservations");

	return (
		<>
			<PublicHeader />

			<div className="min-h-screen pt-20 bg-[#0A0A0A]">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
					<div className="flex flex-col lg:flex-row gap-8">
						<aside className="lg:w-64 shrink-0">
							<AccountSidebar />
						</aside>
						<main className="flex-1 min-w-0">{children}</main>
					</div>
				</div>
			</div>

			<PublicFooter />
			<CookieBanner />
		</>
	);
}
