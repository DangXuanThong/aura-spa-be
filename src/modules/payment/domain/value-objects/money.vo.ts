export class Money {
  private constructor(
    readonly amount: number,
    readonly currency: string,
  ) {}

  static vnd(amount: number): Money {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(`Invalid VND amount: ${amount}`);
    }
    return new Money(Math.round(amount), 'VND');
  }

  /** SePay webhook sends transferAmount as integer VND. */
  matchesSePayTransfer(transferAmount: number): boolean {
    return Math.round(this.amount) === Math.round(transferAmount);
  }
}
