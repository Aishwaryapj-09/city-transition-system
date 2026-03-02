const request = require("supertest");
const app = require("../app");

describe("Accommodation API", () => {
  it("should return 200", async () => {
    const res = await request(app)
      .get("/api/accommodation/search");

    expect(res.statusCode).toBe(200);
  });
});