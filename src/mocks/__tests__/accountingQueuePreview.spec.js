import { beforeEach, describe, expect, it } from "vitest";
import { handleMockRequest } from "../mockApiHandler";
import { resetDemoStore } from "../demoDatabase";

describe("accounting queue journal preview", () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it("returns reference, party, memo, accounts and balanced lines for preview", async () => {
    const result = await handleMockRequest({
      method: "get",
      url: "/accounting-queue/invoice/1003/preview",
    });

    expect(result.status).toBe(200);
    expect(result.data.reference).toBe("INV-2026-1003");
    expect(result.data.name).toBe("Ma Ei Mon");
    expect(result.data.amount).toBe(45000);
    expect(result.data.memo).toContain("INV-2026-1003");
    expect(result.data.can_post).toBe(true);
    expect(result.data.lines.length).toBeGreaterThanOrEqual(2);

    const debit = result.data.lines.reduce((s, l) => s + Number(l.debit), 0);
    const credit = result.data.lines.reduce((s, l) => s + Number(l.credit), 0);
    expect(debit).toBe(45000);
    expect(credit).toBe(45000);
    expect(result.data.lines.every((l) => l.account_id && l.account?.name)).toBe(
      true,
    );
    expect(result.data.lines.some((l) => l.description)).toBe(true);
  });

  it("returns posted invoice lines for the view action", async () => {
    const result = await handleMockRequest({
      method: "get",
      url: "/accounting-queue/invoice/1001/preview",
    });

    expect(result.status).toBe(200);
    expect(result.data.reference).toBe("INV-2026-1001");
    expect(result.data.name).toBe("Ma Thiri");
    expect(result.data.can_post).toBe(false);
    expect(result.data.lines.length).toBeGreaterThanOrEqual(2);
    expect(result.data.lines[0].account?.name).toBeTruthy();
  });
});
