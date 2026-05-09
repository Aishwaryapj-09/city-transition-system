const request = require("supertest");
const axios = require("axios");
const app = require("../../app");

jest.mock("axios");

describe("Nearby Essentials API", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch nearby essentials from mocked Overpass response", async () => {
    axios.post.mockResolvedValue({
      data: {
        elements: [
          {
            type: "node",
            id: 22,
            lat: 12.93,
            lon: 77.61,
            tags: {
              name: "Neighborhood Bank"
            }
          }
        ]
      }
    });

    const res = await request(app)
      .get("/api/nearby?lat=12.9716&lng=77.5946&type=bank");

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.places[0].category).toBe("Bank");
  });

  it("should reject invalid nearby type", async () => {
    const res = await request(app)
      .get("/api/nearby?lat=12.9716&lng=77.5946&type=mall");

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain("type must be one of");
  });
});
