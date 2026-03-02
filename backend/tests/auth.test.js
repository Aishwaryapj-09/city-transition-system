const request = require("supertest");
const app = require("../app");

describe("Auth System", () => {

  let token;
  const email = `user${Date.now()}@test.com`;

  it("should register user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User",
        email,
        password: "123456"
      });

    expect(res.statusCode).toBe(201);
  });

  it("should login user", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email,
        password: "123456"
      });

    expect(res.statusCode).toBe(200);
    token = res.body.token;
  });

  it("should access protected route", async () => {
    const res = await request(app)
      .get("/api/auth/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
  });

  it("should reject without token", async () => {
    const res = await request(app)
      .get("/api/auth/protected");

    expect(res.statusCode).toBe(401);
  });

});