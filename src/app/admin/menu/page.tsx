import { redirect } from "next/navigation";

export const metadata = { title: "Menu" };

export default function AdminMenuPage() {
	redirect("/admin/menu/dishes");
}
