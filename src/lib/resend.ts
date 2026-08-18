import { Resend } from "resend";

let _resend: Resend | null = null;

function getResendClient(): Resend {
	if (!_resend) {
		const key = process.env.RESEND_API_KEY;
		if (!key) {
			throw new Error("[Resend] RESEND_API_KEY manquant dans les variables d'environnement.");
		}
		_resend = new Resend(key);
	}
	return _resend;
}

export const resend = {
	emails: {
		send: async (...args: Parameters<Resend["emails"]["send"]>) => {
			return getResendClient().emails.send(...args);
		},
	},
};

export const FROM_EMAIL =
	process.env.RESEND_FROM_EMAIL || "Spoon Restaurant <onboarding@resend.dev>";
