import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { checkSlotAvailability } from "@/services/availability.service";
import { sendReservationPaymentLink } from "@/services/email.service";
import { broadcastReservationUpdate, createAdminNotification } from "@/services/notification.service";
import { createReservationSchema } from "@/lib/validations";
import { formatDate } from "@/lib/utils";
import { requireAdminSession } from "@/lib/admin-auth";

const PAYMENT_LINK_HOURS = 24;

export async function POST(request: Request) {
  try {
    await requireAdminSession();

    const body = await request.json();
    const parsed = createReservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { date, timeSlot, covers } = parsed.data;

    const settings = await prisma.restaurantSettings.findFirst({
      select: {
        depositRequired: true,
        depositAmountPerCover: true,
      },
    });

    if (settings?.depositRequired === false) {
      return NextResponse.json(
        { error: "L'acompte est désactivé dans les paramètres du restaurant." },
        { status: 422 }
      );
    }

    const available = await checkSlotAvailability(date, timeSlot, covers);
    if (!available) {
      return NextResponse.json(
        { error: "Ce créneau n'est plus disponible. Veuillez choisir un autre créneau." },
        { status: 409 }
      );
    }

    const depositPerCover = Number(settings?.depositAmountPerCover ?? 20);
    const paymentAmount = Math.round(covers * depositPerCover * 100) / 100;

    if (paymentAmount <= 0) {
      return NextResponse.json(
        { error: "Le montant de l'acompte doit être supérieur à 0 €." },
        { status: 422 }
      );
    }

    const deadline = new Date(Date.now() + PAYMENT_LINK_HOURS * 60 * 60 * 1000);

    const reservation = await prisma.reservation.create({
      data: {
        ...parsed.data,
        date: new Date(date),
        userId: null,
        status: "PENDING",
        confirmedAt: null,
        autoConfirmDeadline: deadline,
      },
    });

    // Crée le paiement AVANT l'appel Stripe afin qu'un webhook très rapide
    // puisse toujours retrouver l'enregistrement Payment.
    await prisma.payment.create({
      data: {
        reservationId: reservation.id,
        amount: paymentAmount,
        type: "DEPOSIT",
        status: "PENDING",
      },
    });

    try {
      const formattedDate = formatDate(date, "EEEE d MMMM yyyy");

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: "Acompte de réservation — Spoon",
                description: `${covers} couvert${covers > 1 ? "s" : ""} · ${formattedDate} à ${timeSlot} · Déduit de votre addition le jour de votre venue`,
              },
              unit_amount: Math.round(depositPerCover * 100),
            },
            quantity: covers,
          },
        ],
        metadata: {
          reservationId: reservation.id,
          guestEmail: reservation.guestEmail,
          source: "ADMIN",
        },
        client_reference_id: reservation.id,
        customer_email: reservation.guestEmail,
        success_url: `${process.env.NEXTAUTH_URL}/reservation?payment=success&id=${reservation.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXTAUTH_URL}/reservation?payment=canceled&id=${reservation.id}`,
        expires_at: Math.floor(deadline.getTime() / 1000),
      });

      if (!checkoutSession.url) {
        throw new Error("Stripe n'a pas fourni d'URL Checkout");
      }

      await prisma.payment.update({
        where: { reservationId: reservation.id },
        data: {
          stripeCheckoutSessionId: checkoutSession.id,
          checkoutUrl: checkoutSession.url,
        },
      });

      await sendReservationPaymentLink({
        guestFirstName: reservation.guestFirstName,
        guestEmail: reservation.guestEmail,
        date: reservation.date,
        timeSlot: reservation.timeSlot,
        covers: reservation.covers,
        amount: paymentAmount,
        checkoutUrl: checkoutSession.url,
        expiresAt: deadline,
        reservationId: reservation.id,
      });

      await createAdminNotification({
        type: "new_reservation",
        title: "Réservation créée par l'administration",
        message: `${reservation.guestFirstName} ${reservation.guestLastName} — ${timeSlot} · Acompte en attente`,
        link: `/admin/reservations/${reservation.id}`,
      });

      await broadcastReservationUpdate(reservation.id, null);

      return NextResponse.json(
        {
          data: {
            reservationId: reservation.id,
            checkoutUrl: checkoutSession.url,
            paymentAmount,
            expiresAt: deadline.toISOString(),
          },
        },
        { status: 201 }
      );
    } catch (stripeOrPaymentError) {
      await prisma.$transaction([
        prisma.payment.update({
          where: { reservationId: reservation.id },
          data: {
            status: "FAILED",
            failureReason: "Impossible de créer le lien de paiement Stripe.",
          },
        }),
        prisma.reservation.update({
          where: { id: reservation.id },
          data: {
            status: "CANCELLED_BY_ADMIN",
            cancelledAt: new Date(),
            cancellationReason: "Annulation automatique : impossible de créer le lien de paiement.",
            autoConfirmDeadline: null,
          },
        }),
      ]);

      throw stripeOrPaymentError;
    }
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[POST /api/admin/reservations]", error);
    return NextResponse.json(
      { error: "Erreur interne lors de la création de la réservation" },
      { status: 500 }
    );
  }
}
