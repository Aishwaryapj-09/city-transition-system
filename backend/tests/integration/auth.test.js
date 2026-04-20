const request = require("supertest");
const app = require("../../app");

describe("Auth API", () => {

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
    expect(res.body.token).toBeDefined();

    token = res.body.token;
  });

  // ✅ NEGATIVE CASE
  it("should fail login with wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email,
        password: "wrong"
      });

    expect(res.statusCode).toBe(401);
  });

  it("should access protected route", async () => {
    const res = await request(app)
      .get("/api/auth/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
  });

  it("should reject access without token", async () => {
    const res = await request(app)
      .get("/api/auth/protected");

    expect(res.statusCode).toBe(401);
  });

});