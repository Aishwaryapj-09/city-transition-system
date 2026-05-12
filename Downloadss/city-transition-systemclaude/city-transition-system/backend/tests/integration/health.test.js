const request = require("supertest");
const app = require("../../app");

describe("Health API", () => {

  it("should return status OK", async () => {
    const res = await request(app)
      .get("/api/health");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("OK");
  });

  it("should expose root health endpoint for deployment probes", async () => {
    const res = await request(app)
      .get("/health");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("OK");
  });

});
