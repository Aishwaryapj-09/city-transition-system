const request = require("supertest");
const axios = require("axios");
const app = require("../../app");
const Listing = require("../../models/listing.model");

jest.mock("axios");
jest.mock("../../models/listing.model", () => ({
  find: jest.fn()
}));

describe("Accommodation API", () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({
      data: [
        {
          lat: "12.9716",
          lon: "77.5946"
        }
      ]
    });

    axios.post.mockResolvedValue({
      data: {
        elements: [
          {
            type: "node",
            id: 1,
            lat: 12.972,
            lon: 77.595,
            tags: {
              name: "Live Mock Hotel",
              tourism: "hotel"
            }
          },
          {
            type: "node",
            id: 2,
            lat: 12.973,
            lon: 77.596,
            tags: {
              name: "Live Mock Hostel",
              tourism: "hostel"
            }
          }
        ]
      }
    });

    Listing.find.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch live accommodation results with distance", async () => {
    const res = await request(app)
      .get("/api/accommodation/search?location=Bengaluru");

    expect(res.statusCode).toBe(200);
    expect(res.body.hotels[0]).toMatchObject({
      title: "Live Mock Hotel",
      source: "openstreetmap"
    });
    expect(res.body.hotels[0].distanceKm).toEqual(expect.any(Number));
  });

  it("should keep verified owner listings in the result set", async () => {
    Listing.find.mockResolvedValue([
      {
        _id: "owner-1",
        title: "Verified Owner PG",
        rent: 6000,
        type: "PG",
        location: {
          type: "Point",
          coordinates: [77.5948, 12.9719]
        },
        isVerified: true
      }
    ]);

    const res = await request(app)
      .get("/api/accommodation/search?location=12.9716,77.5946");

    expect(res.statusCode).toBe(200);
    expect(res.body.apartments[0]).toMatchObject({
      title: "Verified Owner PG",
      source: "owner",
      price: 6000
    });
    expect(res.body.apartments[0].distanceKm).toEqual(expect.any(Number));
  });

  it("should handle missing location", async () => {
    const res = await request(app)
      .get("/api/accommodation/search?maxRent=-1");

    expect(res.statusCode).toBe(400);
  });
});
