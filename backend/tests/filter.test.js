const request = require("supertest");
const app = require("../app");

describe("Accommodation Filters", () => {
  it("should filter accommodations by max rent", async () => {
    const res = await request(app)
      .get("/api/accommodation/search?maxRent=6000");

    expect(res.statusCode).toBe(200);
  });
});