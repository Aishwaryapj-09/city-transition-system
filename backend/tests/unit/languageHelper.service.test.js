const axios = require("axios");
const languageHelperService = require("../../services/languageHelper.service");

jest.mock("axios");

describe("Local Language Helper Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("maps Whitefield to Bangalore Kannada phrases", async () => {
    const result = await languageHelperService.resolveLanguageHelper("Whitefield");

    expect(result.detected).toMatchObject({
      locality: "Whitefield",
      city: "Bangalore",
      state: "Karnataka",
      language: "Kannada",
      languageCode: "kn",
      source: "predefined"
    });
    expect(result.phrases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "Emergency",
          englishPhrase: "Call the police"
        }),
        expect.objectContaining({
          category: "Basic Conversation",
          englishPhrase: "Please speak slowly"
        })
      ])
    );
  });

  it("maps Tambaram to Chennai Tamil phrases", async () => {
    const result = await languageHelperService.resolveLanguageHelper("Tambaram");

    expect(result.detected).toMatchObject({
      city: "Chennai",
      state: "Tamil Nadu",
      language: "Tamil"
    });
    expect(result.phrases.some((phrase) => phrase.englishPhrase === "Thank you")).toBe(true);
  });

  it("maps Gachibowli to Hyderabad Telugu phrases", async () => {
    const result = await languageHelperService.resolveLanguageHelper("Gachibowli");

    expect(result.detected).toMatchObject({
      city: "Hyderabad",
      state: "Telangana",
      language: "Telugu"
    });
    expect(result.phrases.some((phrase) => phrase.englishPhrase === "Thank you")).toBe(true);
  });

  it("uses OpenStreetMap geocoding for non-hardcoded places", async () => {
    axios.get.mockResolvedValue({
      data: [
        {
          lat: "12.2958",
          lon: "76.6394",
          display_name: "Dharwad, Karnataka, India",
          address: {
            city: "Dharwad",
            state: "Karnataka",
            country: "India"
          }
        }
      ]
    });

    const result = await languageHelperService.resolveLanguageHelper("Some New Area Dharwad");

    expect(axios.get).toHaveBeenCalledWith(
      "https://nominatim.openstreetmap.org/search",
      expect.objectContaining({
        params: expect.objectContaining({
          q: "Some New Area Dharwad",
          addressdetails: 1
        })
      })
    );
    expect(result.detected).toMatchObject({
      city: "Dharwad",
      state: "Karnataka",
      language: "Kannada",
      languageCode: "kn",
      source: "openstreetmap"
    });
  });

  it("uses current coordinates to detect state language", async () => {
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

    const result = await languageHelperService.resolveLanguageHelper({
      lat: "12.971599",
      lng: "77.594566"
    });

    expect(axios.get).toHaveBeenCalledWith(
      "https://nominatim.openstreetmap.org/reverse",
      expect.objectContaining({
        params: expect.objectContaining({
          lat: "12.971599",
          lon: "77.594566",
          addressdetails: 1
        })
      })
    );
    expect(result.detected).toMatchObject({
      locality: "MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      language: "Kannada",
      languageCode: "kn",
      source: "current-location",
      coordinates: {
        lat: 12.971599,
        lng: 77.594566
      }
    });
  });

  it("rejects geocoded places when state language is unsupported", async () => {
    axios.get.mockResolvedValue({
      data: [
        {
          lat: "1",
          lon: "1",
          display_name: "Unknown",
          address: {
            city: "Unknown",
            state: "Unsupported State"
          }
        }
      ]
    });

    await expect(languageHelperService.resolveLanguageHelper("Unknown Atlantis")).rejects.toThrow(
      "No local language mapping found"
    );
  });

  it("translates exact common phrases from the curated phrasebook", async () => {
    const result = await languageHelperService.translateEnglishText({
      place: "Whitefield",
      text: "Thank you"
    });

    expect(result).toMatchObject({
      input: "Thank you",
      detected: {
        language: "Kannada"
      },
      source: "phrasebook",
      pronunciation: "Dhanyavaadagalu"
    });
    expect(result.translatedText).toBe("ಧನ್ಯವಾದಗಳು");
  });

  it("uses the translation API for custom English sentences", async () => {
    axios.get
      .mockRejectedValueOnce(new Error("Nominatim unavailable"))
      .mockResolvedValueOnce({
        data: {
          responseData: {
            translatedText: "ನನಗೆ ಬಾಡಿಗೆ ಕೊಠಡಿ ಬೇಕು"
          }
        }
      });

    const result = await languageHelperService.translateEnglishText({
      place: "Whitefield",
      text: "I need a rented room"
    });

    expect(axios.get).toHaveBeenLastCalledWith(
      "https://api.mymemory.translated.net/get",
      expect.objectContaining({
        params: {
          q: "I need a rented room",
          langpair: "en|kn"
        }
      })
    );
    expect(result).toMatchObject({
      translatedText: "ನನಗೆ ಬಾಡಿಗೆ ಕೊಠಡಿ ಬೇಕು",
      source: "mymemory-api"
    });
  });
});
