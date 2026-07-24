import type {
  User, Admin, Reservation, Payment, Invoice, MenuCategory,
  Dish, SpecialOffer, GalleryImage, EventRequest, AdminNotification,
  RestaurantSettings, ScheduleDay, ClosedDay,
  Role, ReservationStatus, PaymentStatus, PaymentType,
  OfferType, OfferTarget, GalleryCategory, EventStatus,
} from "@prisma/client";

// ─── Re-exports ───────────────────────────────────────────────────────────────

export type {
  User, Admin, Reservation, Payment, Invoice, MenuCategory,
  Dish, SpecialOffer, GalleryImage, EventRequest, AdminNotification,
  RestaurantSettings, ScheduleDay, ClosedDay,
  Role, ReservationStatus, PaymentStatus, PaymentType,
  OfferType, OfferTarget, GalleryCategory, EventStatus,
};

// ─── Extended types ───────────────────────────────────────────────────────────

export type ReservationWithPayment = Reservation & {
  payment: Payment | null;
  invoice: Invoice | null;
  user: Pick<User, "id" | "firstName" | "lastName" | "email"> | null;
};

export type DishWithCategory = Dish & {
  category: MenuCategory;
};

export type CategoryWithDishes = MenuCategory & {
  dishes: Dish[];
};

export type SpecialOfferWithDetails = SpecialOffer & {
  items: Array<{ dish: Dish }>;
  targets: Array<{ user: Pick<User, "id" | "firstName" | "lastName" | "email"> }>;
};

export type UserWithStats = User & {
  _count: { reservations: number };
};

// ─── API Response ─────────────────────────────────────────────────────────────

export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type ApiError = {
  error: string;
  details?: unknown;
};

// ─── Availability ─────────────────────────────────────────────────────────────

export type TimeSlot = {
  time: string;
  maxCovers: number;
  bookedCovers: number;
  available: boolean;
};

// ─── Admin session ────────────────────────────────────────────────────────────

export type AdminSession = {
  id: string;
  username: string;
  role: Role;
  mustChangePassword: boolean;
};

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export type DashboardStats = {
  todayReservations: number;
  todayCovers: number;
  pendingReservations: number;
  monthRevenue: number;
  monthReservations: number;
  cancellationRate: number;
};

// ─── Schedule slot ────────────────────────────────────────────────────────────

export type ScheduleSlot = {
  time: string;
  maxCovers: number;
};
