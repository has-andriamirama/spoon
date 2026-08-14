import PublicHeader from "@/components/layout/public-header";
import PublicFooter from "@/components/layout/public-footer";
import CookieBanner from "@/components/layout/cookie-banner";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<PublicHeader />
			<main>{children}</main>
			<PublicFooter />
			<CookieBanner />
		</>
	);
}
