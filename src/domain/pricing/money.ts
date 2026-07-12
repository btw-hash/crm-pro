export type Currency = "USD";

/**
 * Money as a value object. Stored in minor units (cents) — an integer,
 * to rule out floating-point rounding errors.
 */
export class Money {
  private constructor(
    public readonly amountMinor: number,
    public readonly currency: Currency,
  ) {}

  static of(amountMinor: number, currency: Currency = "USD"): Money {
    if (!Number.isInteger(amountMinor)) {
      throw new Error("amountMinor must be an integer (cents)");
    }
    return new Money(amountMinor, currency);
  }

  /** Convenience constructor from a decimal amount: Money.dollars(149.9). */
  static dollars(amount: number): Money {
    return new Money(Math.round(amount * 100), "USD");
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor + other.amountMinor, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor - other.amountMinor, this.currency);
  }

  isNegative(): boolean {
    return this.amountMinor < 0;
  }

  multiply(quantity: number): Money {
    return new Money(Math.round(this.amountMinor * quantity), this.currency);
  }

  equals(other: Money): boolean {
    return this.amountMinor === other.amountMinor && this.currency === other.currency;
  }

  format(locale = "en-US"): string {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: this.currency,
    }).format(this.amountMinor / 100);
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new Error(`Currency mismatch: ${this.currency} and ${other.currency}`);
    }
  }
}
