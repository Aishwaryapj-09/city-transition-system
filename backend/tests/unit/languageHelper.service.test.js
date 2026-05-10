const languageHelperService = require("../../services/languageHelper.service");

describe("Local Language Helper Service", () => {
  it("maps Whitefield to Bangalore Kannada phrases", () => {
    const result = languageHelperService.resolveLanguageHelper("Whitefield");

    expect(result.detected).toMatchObject({
      locality: "Whitefield",
      city: "Bangalore",
      state: "Karnataka",
      language: "Kannada"
    });
    expect(result.phrases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "Emergency",
          englishPhrase: "Call the police",
          localPhrase: "ಪೊಲೀಸರನ್ನು ಕರೆ ಮಾಡಿ"
        })
      ])
    );
  });

  it("maps Tambaram to Chennai Tamil phrases", () => {
    const result = languageHelperService.resolveLanguageHelper("Tambaram");

    expect(result.detected).toMatchObject({
      city: "Chennai",
      state: "Tamil Nadu",
      language: "Tamil"
    });
    expect(result.phrases.some((phrase) => phrase.localPhrase === "நன்றி")).toBe(true);
  });

  it("maps Gachibowli to Hyderabad Telugu phrases", () => {
    const result = languageHelperService.resolveLanguageHelper("Gachibowli");

    expect(result.detected).toMatchObject({
      city: "Hyderabad",
      state: "Telangana",
      language: "Telugu"
    });
    expect(result.phrases.some((phrase) => phrase.localPhrase === "ధన్యవాదాలు")).toBe(true);
  });

  it("rejects unknown places with a useful error", () => {
    expect(() => languageHelperService.resolveLanguageHelper("Unknown Atlantis")).toThrow(
      "No city or language mapping found"
    );
  });
});
