const axios = require("axios");
const nearbyService = require("../../services/nearby.service");

jest.mock("axios");

describe("Nearby Essentials Service Unit Tests", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should build an Overpass query for selected service type", () => {
    const query = nearbyService.buildNearbyQuery({
      lat: 12.9716,
      lng: 77.5946,
      radius: 3000,
      type: "hospital"
    });

    expect(query).toContain('node["amenity"="hospital"](around:3000,12.9716,77.5946)');
    expect(query).toContain("out center tags");
  });

  it("should validate supported essentials only", () => {
    expect(() => nearbyService.validateNearbyInput({
      lat: "12.9716",
      lng: "77.5946",
      type: "mall"
    })).toThrow("type must be one of");
  });

  it("should convert mocked Overpass response into nearby places", async () => {
    axios.post.mockResolvedValue({
      data: {
        elements: [
          {
            type: "node",
            id: 101,
            lat: 12.97,
            lon: 77.59,
            tags: {
              name: "City Care Hospital",
              "addr:street": "MG Road"
            }
          }
        ]
      }
    });

    const result = await nearbyService.findNearbyEssentials({
      lat: "12.9716",
      lng: "77.5946",
      type: "hospital",
      radius: "3000"
    });

    expect(result.count).toBe(1);
    expect(result.places[0]).toMatchObject({
      id: "node-101",
      name: "City Care Hospital",
      category: "Hospital",
      source: "openstreetmap"
    });
  });
});
