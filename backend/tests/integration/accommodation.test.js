const request = require("supertest");
const app = require("../../app");

describe("Accommodation API", () => {

  it("should fetch accommodations", async () => {
    const res = await request(app)
      .get("/api/accommodation/search");

    expect(res.statusCode).toBe(200);
  });

  it("should filter by max rent", async () => {
    const res = await request(app)
      .get("/api/accommodation/search?maxRent=6000");

    expect(res.statusCode).toBe(200);
  });

  // ✅ NEGATIVE CASE
  it("should handle invalid query", async () => {
    const res = await request(app)
      .get("/api/accommodation/search?maxRent=-1");

    expect([200, 400]).toContain(res.statusCode);
  });

});