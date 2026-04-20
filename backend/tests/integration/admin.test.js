const request = require("supertest");
const app = require("../../app");

describe("Admin Approval Flow", () => {

  let adminToken;
  let ownerToken;
  let listingId;

  const adminEmail = `admin${Date.now()}@test.com`;
  const ownerEmail = `owner${Date.now()}@test.com`;

  it("should register admin", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Admin",
        email: adminEmail,
        password: "123456",
        role: "admin"
      });

    expect(res.statusCode).toBe(201);
  });

  it("should login admin", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: adminEmail,
        password: "123456"
      });

    adminToken = res.body.token;
    expect(adminToken).toBeDefined();
  });

  it("should register owner", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Owner",
        email: ownerEmail,
        password: "123456",
        role: "owner"
      });

    expect(res.statusCode).toBe(201);
  });

  it("should login owner", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: ownerEmail,
        password: "123456"
      });

    ownerToken = res.body.token;
  });

  it("owner creates listing", async () => {
    const res = await request(app)
      .post("/api/accommodation")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        title: "Test PG",
        description: "Nice place",
        area: "Bangalore",
        rent: 5000,
        type: "PG",
        location: {
          type: "Point",
          coordinates: [77.6, 12.9]
        }
      });

    expect(res.statusCode).toBe(200);
    listingId = res.body.listing?._id || res.body._id;
  });

  it("admin should fetch pending listings", async () => {
    const res = await request(app)
      .get("/api/accommodation/pending")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
  });

  it("admin verifies listing", async () => {
    const res = await request(app)
      .patch(`/api/accommodation/verify/${listingId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect([200, 400]).toContain(res.statusCode);
  });

  // ✅ NEGATIVE CASE
  it("owner should NOT verify listing", async () => {
    const res = await request(app)
      .patch(`/api/accommodation/verify/${listingId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(403);
  });

});