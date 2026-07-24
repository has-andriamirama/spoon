import { resend, FROM_EMAIL } from "@/lib/resend";
import { formatDate, formatPrice } from "@/lib/utils";
import type { Reservation } from "@/types";

export async function sendReservationConfirmation(reservation: {
  id: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  date: Date;
  timeSlot: string;
  covers: number;
  notes?: string | null;
}): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: reservation.guestEmail,
    subject: `Confirmation de votre réservation chez Spoon`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: #F5F0EB; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 28px; color: #C8973A; margin: 0;">Spoon</h1>
          <p style="color: #9A8F84; margin: 8px 0 0;">Restaurant créole haut de gamme</p>
        </div>
        <h2 style="font-size: 20px; margin-bottom: 24px;">Votre réservation est confirmée ✓</h2>
        <p>Bonjour ${reservation.guestFirstName},</p>
        <p>Nous avons bien reçu votre demande de réservation et nous avons hâte de vous accueillir.</p>
        <div style="background: #141414; border: 1px solid #222; border-radius: 8px; padding: 24px; margin: 24px 0;">
          <h3 style="color: #C8973A; margin: 0 0 16px;">Détails de votre réservation</h3>
          <p style="margin: 8px 0;"><strong>Date :</strong> ${formatDate(reservation.date)}</p>
          <p style="margin: 8px 0;"><strong>Heure :</strong> ${reservation.timeSlot}</p>
          <p style="margin: 8px 0;"><strong>Nombre de couverts :</strong> ${reservation.covers}</p>
          ${reservation.notes ? `<p style="margin: 8px 0;"><strong>Notes :</strong> ${reservation.notes}</p>` : ""}
          <p style="margin: 8px 0;"><strong>Référence :</strong> #${reservation.id.slice(-8).toUpperCase()}</p>
        </div>
        <div style="background: #141414; border: 1px solid #222; border-radius: 8px; padding: 24px; margin: 24px 0;">
          <h3 style="color: #C8973A; margin: 0 0 16px;">Informations pratiques</h3>
          <p style="margin: 8px 0;">📍 12 Rue de Paris, 97400 Saint-Denis, La Réunion</p>
          <p style="margin: 8px 0;">📞 +262 692 00 00 00</p>
        </div>
        <p style="color: #9A8F84; font-size: 14px;">Pour annuler ou modifier votre réservation, contactez-nous au moins 48h à l'avance.</p>
        <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #222;">
          <p style="color: #9A8F84; font-size: 12px;">© Spoon Restaurant · Saint-Denis, La Réunion</p>
        </div>
      </div>
    `,
  });
}

export async function sendReservationReminder(reservation: {
  guestFirstName: string;
  guestEmail: string;
  date: Date;
  timeSlot: string;
  covers: number;
}): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: reservation.guestEmail,
    subject: `Rappel : votre réservation chez Spoon demain`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: #F5F0EB; padding: 40px; border-radius: 12px;">
        <h1 style="font-size: 28px; color: #C8973A; text-align: center;">Spoon</h1>
        <h2 style="font-size: 20px; margin-top: 32px;">Rappel de votre réservation 🍽️</h2>
        <p>Bonjour ${reservation.guestFirstName},</p>
        <p>Nous vous rappelons votre réservation chez Spoon <strong>demain</strong> :</p>
        <div style="background: #141414; border: 1px solid #222; border-radius: 8px; padding: 24px; margin: 24px 0;">
          <p style="margin: 8px 0;"><strong>Date :</strong> ${formatDate(reservation.date)}</p>
          <p style="margin: 8px 0;"><strong>Heure :</strong> ${reservation.timeSlot}</p>
          <p style="margin: 8px 0;"><strong>Couverts :</strong> ${reservation.covers}</p>
        </div>
        <p>Nous avons hâte de vous accueillir. À demain !</p>
        <p style="color: #9A8F84; font-size: 14px; margin-top: 24px;">Besoin d'annuler ? Contactez-nous dès que possible au +262 692 00 00 00</p>
      </div>
    `,
  });
}

export async function sendCancellationEmail(reservation: {
  guestFirstName: string;
  guestEmail: string;
  date: Date;
  timeSlot: string;
  cancellationReason?: string | null;
}): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: reservation.guestEmail,
    subject: `Annulation de votre réservation chez Spoon`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: #F5F0EB; padding: 40px; border-radius: 12px;">
        <h1 style="font-size: 28px; color: #C8973A; text-align: center;">Spoon</h1>
        <h2 style="font-size: 20px; margin-top: 32px;">Annulation confirmée</h2>
        <p>Bonjour ${reservation.guestFirstName},</p>
        <p>Votre réservation du <strong>${formatDate(reservation.date)} à ${reservation.timeSlot}</strong> a été annulée.</p>
        ${reservation.cancellationReason ? `<p>Motif : ${reservation.cancellationReason}</p>` : ""}
        <p>Nous espérons vous accueillir prochainement chez Spoon.</p>
        <p style="color: #9A8F84; font-size: 14px;">Pour réserver à nouveau : <a href="https://spoon.re/reservation" style="color: #C8973A;">spoon.re/reservation</a></p>
      </div>
    `,
  });
}

export async function sendPaymentConfirmation(data: {
  guestFirstName: string;
  guestEmail: string;
  amount: number;
  date: Date;
  timeSlot: string;
  invoiceNumber: string;
}): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: data.guestEmail,
    subject: `Paiement reçu — Réservation Spoon`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: #F5F0EB; padding: 40px; border-radius: 12px;">
        <h1 style="font-size: 28px; color: #C8973A; text-align: center;">Spoon</h1>
        <h2 style="font-size: 20px; margin-top: 32px;">Paiement confirmé ✓</h2>
        <p>Bonjour ${data.guestFirstName},</p>
        <p>Votre paiement de <strong>${formatPrice(data.amount)}</strong> a bien été reçu.</p>
        <div style="background: #141414; border: 1px solid #222; border-radius: 8px; padding: 24px; margin: 24px 0;">
          <p style="margin: 8px 0;"><strong>Montant :</strong> ${formatPrice(data.amount)}</p>
          <p style="margin: 8px 0;"><strong>Réservation :</strong> ${formatDate(data.date)} à ${data.timeSlot}</p>
          <p style="margin: 8px 0;"><strong>N° Facture :</strong> ${data.invoiceNumber}</p>
        </div>
        <p>Votre réservation est maintenant confirmée. À bientôt chez Spoon !</p>
      </div>
    `,
  });
}

export async function sendRefundConfirmation(data: {
  guestFirstName: string;
  guestEmail: string;
  amount: number;
}): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: data.guestEmail,
    subject: `Remboursement effectué — Spoon`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: #F5F0EB; padding: 40px; border-radius: 12px;">
        <h1 style="font-size: 28px; color: #C8973A; text-align: center;">Spoon</h1>
        <h2 style="font-size: 20px; margin-top: 32px;">Remboursement effectué</h2>
        <p>Bonjour ${data.guestFirstName},</p>
        <p>Votre remboursement de <strong>${formatPrice(data.amount)}</strong> a été initié.</p>
        <p style="color: #9A8F84;">Le montant sera crédité sur votre compte bancaire sous 5 à 10 jours ouvrés selon votre banque.</p>
        <p>Nous espérons vous accueillir à nouveau chez Spoon.</p>
      </div>
    `,
  });
}

export async function sendPasswordReset(data: {
  firstName: string;
  email: string;
  resetUrl: string;
}): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: data.email,
    subject: `Réinitialisation de votre mot de passe — Spoon`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: #F5F0EB; padding: 40px; border-radius: 12px;">
        <h1 style="font-size: 28px; color: #C8973A; text-align: center;">Spoon</h1>
        <h2 style="font-size: 20px; margin-top: 32px;">Réinitialisation du mot de passe</h2>
        <p>Bonjour ${data.firstName},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.resetUrl}" style="background: #C8973A; color: #0A0A0A; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Réinitialiser mon mot de passe</a>
        </div>
        <p style="color: #9A8F84; font-size: 14px;">Ce lien expirera dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      </div>
    `,
  });
}

export async function sendEmailVerification(data: {
  firstName: string;
  email: string;
  verifyUrl: string;
}): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: data.email,
    subject: `Confirmez votre email — Spoon`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: #F5F0EB; padding: 40px; border-radius: 12px;">
        <h1 style="font-size: 28px; color: #C8973A; text-align: center;">Spoon</h1>
        <h2 style="font-size: 20px; margin-top: 32px;">Bienvenue chez Spoon !</h2>
        <p>Bonjour ${data.firstName},</p>
        <p>Merci de vous être inscrit. Confirmez votre adresse email pour activer votre compte.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.verifyUrl}" style="background: #C8973A; color: #0A0A0A; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Confirmer mon email</a>
        </div>
        <p style="color: #9A8F84; font-size: 14px;">Ce lien expirera dans 24 heures.</p>
      </div>
    `,
  });
}

export async function sendAdminNewReservationAlert(reservation: {
  guestFirstName: string;
  guestLastName: string;
  date: Date;
  timeSlot: string;
  covers: number;
  adminEmail: string;
}): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: reservation.adminEmail,
    subject: `Nouvelle réservation — ${reservation.guestFirstName} ${reservation.guestLastName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Nouvelle réservation reçue</h2>
        <p><strong>Client :</strong> ${reservation.guestFirstName} ${reservation.guestLastName}</p>
        <p><strong>Date :</strong> ${formatDate(reservation.date)} à ${reservation.timeSlot}</p>
        <p><strong>Couverts :</strong> ${reservation.covers}</p>
        <p><a href="${process.env.NEXTAUTH_URL}/admin/reservations">Voir dans l'admin →</a></p>
      </div>
    `,
  });
}
