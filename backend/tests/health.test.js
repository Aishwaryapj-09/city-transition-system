const request = require("supertest");
const app = require("../app");

describe("Health API", () => {
  it("should return 200 and status OK", async () => {
    const res = await request(app).get("/api/health");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("OK");
  });
});