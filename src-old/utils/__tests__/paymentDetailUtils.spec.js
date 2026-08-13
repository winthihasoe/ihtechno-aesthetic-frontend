import { describe, expect, it } from "vitest";
import {
  applyOrderDiscountToTotals,
  applyVatToTotals,
  computeTotalsFromLines,
  invoiceAmountDueBeforeNextPayment,
  previewRemainingAfterPartialPayment,
  resolveEffectiveVatPercent,
  resolvePaymentCollectionAmount,
} from "../paymentDetailUtils";

describe("resolveEffectiveVatPercent", () => {
  it("uses payment.tax_percentage when positive", () => {
    expect(
      resolveEffectiveVatPercent(
        { tax_percentage: 7 },
        { vat_enabled: true, default_vat_percent: 5 },
      ),
    ).toBe(7);
  });

  it("uses default when tax enabled and payment has no rate", () => {
    expect(
      resolveEffectiveVatPercent(
        { tax_percentage: 0 },
        { vat_enabled: true, default_vat_percent: 5 },
      ),
    ).toBe(5);
  });

  it("returns 0 when tax disabled and no payment rate", () => {
    expect(
      resolveEffectiveVatPercent(
        { tax_percentage: 0 },
        { vat_enabled: false, default_vat_percent: 5 },
      ),
    ).toBe(0);
  });
});

describe("invoiceAmountDueBeforeNextPayment", () => {
  it("uses balance when set (partial invoice)", () => {
    expect(
      invoiceAmountDueBeforeNextPayment(
        { status: "partial", balance: 25000, total_amount: 105000 },
        105000,
      ),
    ).toBe(25000);
  });

  it("uses balance for new issued invoices", () => {
    expect(
      invoiceAmountDueBeforeNextPayment(
        { status: "issued", balance: 105000, total_amount: 105000 },
        105000,
      ),
    ).toBe(105000);
  });
});

describe("previewRemainingAfterPartialPayment", () => {
  it("uses server balance when no partial amount entered on partial invoice", () => {
    expect(
      previewRemainingAfterPartialPayment({
        payment: { status: "partial", balance: 100000, total_amount: 200000 },
        totalsGrand: 200000,
        partialPaymentAmount: "",
      }),
    ).toBe(100000);
  });

  it("does not subtract a stale partial amount after prior collection", () => {
    expect(
      previewRemainingAfterPartialPayment({
        payment: { status: "partial", balance: 100000, total_amount: 200000 },
        totalsGrand: 200000,
        partialPaymentAmount: "100000",
      }),
    ).toBe(0);
  });

  it("previews remaining for next partial entry on partial invoice", () => {
    expect(
      previewRemainingAfterPartialPayment({
        payment: { status: "partial", balance: 100000, total_amount: 200000 },
        totalsGrand: 200000,
        partialPaymentAmount: "40000",
      }),
    ).toBe(60000);
  });

  it("previews remaining on first partial for issued invoice", () => {
    expect(
      previewRemainingAfterPartialPayment({
        payment: { status: "issued", balance: 200000, total_amount: 200000 },
        totalsGrand: 200000,
        partialPaymentAmount: "100000",
      }),
    ).toBe(100000);
  });
});

describe("resolvePaymentCollectionAmount", () => {
  const issued = { status: "issued", balance: 100000, total_amount: 100000 };
  const partial = { status: "partial", balance: 40000, total_amount: 100000 };

  it("full payment on new invoice posts full amount due", () => {
    const r = resolvePaymentCollectionAmount({
      paymentCollectionMode: "full",
      partialPaymentAmount: "",
      payment: issued,
      totalsGrand: 100000,
    });
    expect(r).toEqual({ ok: true, mode: "full", amount: 100000, amountDue: 100000 });
  });

  it("partial payment posts entered amount only", () => {
    const r = resolvePaymentCollectionAmount({
      paymentCollectionMode: "partial",
      partialPaymentAmount: "30000",
      payment: issued,
      totalsGrand: 100000,
    });
    expect(r).toEqual({ ok: true, mode: "partial", amount: 30000, amountDue: 100000 });
  });

  it("full payment on partially paid invoice posts remaining balance only", () => {
    const r = resolvePaymentCollectionAmount({
      paymentCollectionMode: "full",
      partialPaymentAmount: "",
      payment: partial,
      totalsGrand: 100000,
    });
    expect(r).toEqual({ ok: true, mode: "full", amount: 40000, amountDue: 40000 });
  });
});

describe("applyVatToTotals", () => {
  it("adds tax to grand and exposes net_before_tax", () => {
    const lineTotals = computeTotalsFromLines([
      {
        type: "product",
        label: "X",
        qty: 1,
        unit_price: 100000,
        discount_type: "none",
        discount_value: 0,
        line_total: 100000,
      },
    ]);
    const afterDisc = applyOrderDiscountToTotals(lineTotals, {
      type: "none",
      value: 0,
    });
    const withVat = applyVatToTotals(afterDisc, 5);
    expect(withVat.net_before_tax).toBe(100000);
    expect(withVat.tax).toBe(5000);
    expect(withVat.grand).toBe(105000);
    expect(withVat.tax_percent).toBe(5);
  });
});
