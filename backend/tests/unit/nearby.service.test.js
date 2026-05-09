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

  it("should validate supported essentials only", async () => {
    await expect(nearbyService.validateNearbyInput({
      lat: "12.9716",
      lng: "77.5946",
      type: "mall"
    })).rejects.toThrow("type must be one of");
  });

  it("should geocode area name before querying nearby essentials", async () => {
    axios.get.mockResolvedValue({
      data: [
        {
          lat: "13.0540",
          lon: "77.5044",
          display_name: "Yeshwanthpur, Bengaluru"
        }
      ]
    });

    axios.post.mockResolvedValue({
      data: {
        elements: []
      }
    });

    const result = await nearbyService.findNearbyEssentials({
      location: "Yeshwanthpur",
      type: "bank",
      radius: "3000"
    });

    expect(axios.get).toHaveBeenCalledWith(
      "https://nominatim.openstreetmap.org/search",
      expect.objectContaining({
        params: expect.objectContaining({ q: "Yeshwanthpur" })
      })
    );
    expect(result.search).toMatchObject({
      lat: 13.054,
      lng: 77.5044,
      displayName: "Yeshwanthpur, Bengaluru"
    });
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
