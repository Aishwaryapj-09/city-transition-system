const request = require("supertest");
const axios = require("axios");
const app = require("../../app");

jest.mock("axios");

describe("Local Language Helper API", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("detects a locality and returns phrase categories", async () => {
    axios.get.mockResolvedValue({
      data: [
        {
          lat: "12.8452",
          lon: "77.6602",
          display_name: "Electronic City, Karnataka, India",
          address: {
            city: "Electronic City",
            state: "Karnataka",
            country: "India"
          }
        }
      ]
    });

    const res = await request(app)
      .get("/api/language-helper?place=Electronic%20City");

    expect(res.statusCode).toBe(200);
    expect(res.body.detected).toMatchObject({
      city: "Bangalore",
      state: "Karnataka",
      language: "Kannada",
      languageCode: "kn"
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

  it("detects state language from current coordinates", async () => {
    axios.get.mockResolvedValue({
      data: {
        display_name: "MG Road, Bengaluru, Karnataka, India",
        address: {
          suburb: "MG Road",
          city: "Bengaluru",
          state: "Karnataka",
          country: "India"
        }
      }
    });

    const res = await request(app)
      .get("/api/language-helper?lat=12.971599&lng=77.594566");

    expect(res.statusCode).toBe(200);
    expect(res.body.input).toBe("12.971599,77.594566");
    expect(res.body.detected).toMatchObject({
      city: "Bengaluru",
      state: "Karnataka",
      language: "Kannada",
      languageCode: "kn",
      source: "current-location"
    });
    expect(res.body.detected.coordinates).toMatchObject({
      lat: 12.971599,
      lng: 77.594566
    });
  });
});
