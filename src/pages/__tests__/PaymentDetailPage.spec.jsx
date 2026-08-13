import { describe, expect, it } from "vitest";
import {
  isDraftRefreshablePaymentStatus,
  isInvoicePreviewOpenStatus,
  isInvoiceTerminalStatus,
  isPayablePaymentStatus,
} from "../../utils/paymentDetailUtils";

describe("PaymentDetailPage status gates", () => {
  it("allows draft refresh for draft, unpaid, issued", () => {
    expect(isDraftRefreshablePaymentStatus("draft")).toBe(true);
    expect(isDraftRefreshablePaymentStatus("unpaid")).toBe(true);
    expect(isDraftRefreshablePaymentStatus("issued")).toBe(true);
  });

  it("allows payment actions for draft, unpaid, issued", () => {
    expect(isPayablePaymentStatus("draft")).toBe(true);
    expect(isPayablePaymentStatus("unpaid")).toBe(true);
    expect(isPayablePaymentStatus("issued")).toBe(true);
  });

  it("blocks draft refresh and payment actions for paid/void", () => {
    expect(isDraftRefreshablePaymentStatus("paid")).toBe(false);
    expect(isDraftRefreshablePaymentStatus("void")).toBe(false);
    expect(isPayablePaymentStatus("paid")).toBe(false);
    expect(isPayablePaymentStatus("void")).toBe(false);
  });

  it("treats only paid and void as terminal for payment collection", () => {
    expect(isInvoiceTerminalStatus("paid")).toBe(true);
    expect(isInvoiceTerminalStatus("void")).toBe(true);
    expect(isInvoiceTerminalStatus("partial")).toBe(false);
    expect(isInvoiceTerminalStatus("issued")).toBe(false);
  });

  it("allows preview dialog for issued, partial, unpaid, and paid", () => {
    expect(isInvoicePreviewOpenStatus("issued")).toBe(true);
    expect(isInvoicePreviewOpenStatus("partial")).toBe(true);
    expect(isInvoicePreviewOpenStatus("unpaid")).toBe(true);
    expect(isInvoicePreviewOpenStatus("paid")).toBe(true);
    expect(isInvoicePreviewOpenStatus("draft")).toBe(false);
    expect(isInvoicePreviewOpenStatus("void")).toBe(false);
  });
});
