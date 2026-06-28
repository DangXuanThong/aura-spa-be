export class CreateDepositPaymentCommand {
  constructor(
    readonly bookingId: string,
    readonly customerId: string,
  ) {}
}
