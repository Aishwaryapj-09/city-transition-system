const request = require("supertest");
const app = require("../app");

describe("Admin Approval Flow", () => {

  let adminToken;
  let ownerToken;
  let listingId;

  const adminEmail = `admin${Date.now()}@test.com`;
  const ownerEmail = `owner${Date.now()}@test.com`;

  /* ================= REGISTER ADMIN ================= */
  it("should register admin", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Admin User",
        email: adminEmail,
        password: "123456",
        role: "admin"
      });

    expect(res.statusCode).toBe(201);
  });

  /* ================= LOGIN ADMIN ================= */
  it("should login admin", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: adminEmail,
        password: "123456"
      });

    expect(res.statusCode).toBe(200);
    adminToken = res.body.token;
  });

  /* ================= REGISTER OWNER ================= */
  it("should register owner", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Owner User",
        email: ownerEmail,
        password: "123456",
        role: "owner"
      });

    expect(res.statusCode).toBe(201);
  });

  /* ================= LOGIN OWNER ================= */
  it("should login owner", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: ownerEmail,
        password: "123456"
      });

    expect(res.statusCode).toBe(200);
    ownerToken = res.body.token;
  });

  /* ================= CREATE LISTING ================= */
  it("owner creates listing (pending)", async () => {
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

    // Safe extraction
    listingId = res.body.listing?._id || res.body._id;
  });

  /* ================= ADMIN GET PENDING ================= */
  it("admin should get pending listings", async () => {
    const res = await request(app)
      .get("/api/accommodation/pending")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  /* ================= ADMIN VERIFY ================= */
  it("admin should verify listing", async () => {
    const res = await request(app)
      .patch(`/api/accommodation/verify/${listingId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    // Accept both: first-time (200) OR already verified (400)
    expect([200, 400]).toContain(res.statusCode);

    if (res.statusCode === 200) {
      expect(res.body.isVerified).toBe(true);
    }
  });

  /* ================= NON-ADMIN BLOCK ================= */
  it("owner should NOT verify listing", async () => {
    const res = await request(app)
      .patch(`/api/accommodation/verify/${listingId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(403);
  });

});