export const AUTH_EVENTS = {
  USER_REGISTERED: 'auth.user_registered',
} as const;

export const BOOKING_EVENTS = {
  CREATED: 'booking.created',
  CANCELLED: 'booking.cancelled',
  COMPLETED: 'booking.completed',
  RESCHEDULED: 'booking.rescheduled',
  TRANSFERRED: 'booking.transferred',
  CHECKED_IN: 'booking.checked_in',
  WALK_IN_PHONE_CONFLICT: 'booking.walk_in_phone_conflict',
} as const;

export const SCHEDULE_REQUEST_EVENTS = {
  APPROVED: 'schedule_request.approved',
  REJECTED: 'schedule_request.rejected',
  CANCELLED: 'schedule_request.cancelled',
} as const;

export const PAYMENT_EVENTS = {
  PROCESSED: 'payment.processed',
  DEPOSIT_PAID: 'payment.deposit_paid',
} as const;

export const INVENTORY_EVENTS = {
  LOW_STOCK: 'inventory.low_stock',
} as const;

export const COMPLAINT_EVENTS = {
  CREATED: 'complaint.created',
} as const;
