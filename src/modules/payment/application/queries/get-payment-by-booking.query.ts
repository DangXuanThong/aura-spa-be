export class GetPaymentByBookingQuery {
  constructor(
    readonly bookingId: string,
    readonly customerId: string,
  ) {}
}
