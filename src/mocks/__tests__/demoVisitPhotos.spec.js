import { beforeEach, describe, expect, it } from "vitest";
import { handleMockRequest } from "../mockApiHandler";
import { resetDemoStore } from "../demoDatabase";

function makeFile(name = "demo.jpg") {
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  return new File([bytes], name, { type: "image/png" });
}

describe("demo visit photos", () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it("stores uploaded photos and returns preview urls", async () => {
    const formData = new FormData();
    formData.append("photo", makeFile());
    formData.append("type", "before");
    formData.append("stage", "consultation");
    formData.append("body_area", "face");
    formData.append("side", "left");

    const created = await handleMockRequest({
      method: "post",
      url: "/visits/3/photos",
      data: formData,
    });

    expect(created.status).toBe(201);
    expect(created.data.url).toMatch(/^data:/);
    expect(created.data.type).toBe("before");
    expect(created.data.stage).toBe("consultation");
    expect(created.data.body_area).toBe("face");
    expect(created.data.side).toBe("left");

    const listed = await handleMockRequest({
      method: "get",
      url: "/visits/3/photos",
    });
    expect(listed.data).toHaveLength(1);
    expect(listed.data[0].id).toBe(created.data.id);
    expect(listed.data[0].url).toMatch(/^data:/);
  });
});
