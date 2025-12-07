import { Injectable } from '@nestjs/common';
import { Currency } from '@bookkeeping/shared';

@Injectable()
export class CurrencyService {
    private exchangeRates: Record<string, number> = {
        [Currency.AED]: 1,
        [Currency.USD]: 3.67, // Fixed peg
        [Currency.EUR]: 4.0,  // Approximate
    };

    async getExchangeRate(from: Currency, to: Currency): Promise<number> {
        const fromRate = this.exchangeRates[from];
        const toRate = this.exchangeRates[to];

        if (!fromRate || !toRate) {
            throw new Error('Invalid currency');
        }

        // Convert to base (AED) then to target
        return (1 / fromRate) * toRate; // Wait, logic check:
        // 1 USD = 3.67 AED.
        // To convert USD to AED: amount * 3.67.
        // To convert AED to USD: amount / 3.67.

        // If rates are defined as "How many AED is 1 Unit":
        // USD = 3.67 AED
        // EUR = 4.0 AED
        // AED = 1 AED

        // Convert FROM to AED, then AED to TO.
        // Amount in AED = amount * this.exchangeRates[from]
        // Amount in TO = Amount in AED / this.exchangeRates[to]

        return this.exchangeRates[from] / this.exchangeRates[to];
    }

    async convert(amount: number, from: Currency, to: Currency): Promise<number> {
        const rate = await this.getExchangeRate(from, to);
        return amount * rate;
    }
}
