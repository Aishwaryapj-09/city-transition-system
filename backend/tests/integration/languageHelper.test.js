const request = require("supertest");
const app = require("../../app");

describe("Local Language Helper API", () => {
  it("detects a locality and returns phrase categories", async () => {
    const res = await request(app)
      .get("/api/language-helper?place=Electronic%20City");

    expect(res.statusCode).toBe(200);
    expect(res.body.detected).toMatchObject({
      city: "Bangalore",
      state: "Karnataka",
      language: "Kannada"
    });
    expect(res.body.categories).toEqual(
      expect.arrayContaining([
        "Basic Conversation",
        "Transport",
        "Emergency",
        "Food & Shopping"
      ])
    );
    expect(res.body.phrases.length).toBeGreaterThan(0);
  });

  it("requires a place query parameter", async () => {
    const res = await request(app).get("/api/language-helper");

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("place is required");
  });
});
