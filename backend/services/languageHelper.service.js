const {
  CATEGORIES,
  LOCATION_MAPPINGS,
  PHRASES_BY_LANGUAGE,
  STATE_LANGUAGE_MAPPINGS,
  TRANSLATION_LANGUAGE_CODES
} = require("../data/languageHelper.data");
const axios = require("axios");
const {
  geocodePlace,
  parseCoordinatePair,
  reverseGeocodeCoordinates
} = require("./geo.service");

const MYMEMORY_TRANSLATE_URL = "https://api.mymemory.translated.net/get";

const normalize = (value = "") => (
  String(value)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim()
);

const scoreLocalityMatch = (query, locality) => {
  const normalizedQuery = normalize(query);
  const normalizedLocality = normalize(locality);

  if (!normalizedQuery || !normalizedLocality) {
    return 0;
  }

  if (normalizedQuery === normalizedLocality) {
    return 100;
  }

  if (normalizedQuery.includes(normalizedLocality) || normalizedLocality.includes(normalizedQuery)) {
    return 80;
  }

  const queryWords = new Set(normalizedQuery.split(" "));
  const localityWords = normalizedLocality.split(" ");
  const matchedWords = localityWords.filter((word) => queryWords.has(word));

  return matchedWords.length === localityWords.length ? 40 + matchedWords.length * 10 : 0;
};

const findLocationMatch = (place) => {
  let bestMatch = null;

  LOCATION_MAPPINGS.forEach((mapping) => {
    mapping.localities.forEach((locality) => {
      const score = scoreLocalityMatch(place, locality);

      if (score > (bestMatch?.score || 0)) {
        bestMatch = {
          score,
          matchedLocality: locality,
          city: mapping.city,
          state: mapping.state,
          language: mapping.language
        };
      }
    });
  });

  return bestMatch && bestMatch.score >= 40 ? bestMatch : null;
};

const pickCityFromAddress = (address, fallbackCity) => {
  const locationAddress = address || {};

  return (
    locationAddress.city ||
    locationAddress.town ||
    locationAddress.municipality ||
    locationAddress.village ||
    locationAddress.city_district ||
    locationAddress.state_district ||
    fallbackCity
  );
};

const pickLocalityFromAddress = (address, fallbackLocality) => {
  const locationAddress = address || {};

  return (
    locationAddress.suburb ||
    locationAddress.neighbourhood ||
    locationAddress.quarter ||
    locationAddress.residential ||
    locationAddress.road ||
    locationAddress.hamlet ||
    locationAddress.city ||
    locationAddress.town ||
    locationAddress.village ||
    fallbackLocality
  );
};

const getStateConfig = (state) => {
  const normalizedState = normalize(state);

  return Object.entries(STATE_LANGUAGE_MAPPINGS).find(([mappedState]) => (
    normalize(mappedState) === normalizedState
  ))?.[1];
};

const resolveLocationByGeocoding = async (place) => {
  const result = await geocodePlace(place);
  return resolveLocationFromAddress({
    address: result.address || {},
    fallbackLocality: place,
    source: "openstreetmap"
  });
};

const resolveLocationByCoordinates = async ({ lat, lng }) => {
  const result = await reverseGeocodeCoordinates(lat, lng);
  return resolveLocationFromAddress({
    address: result.address || {},
    fallbackLocality: result.displayName,
    source: "current-location",
    coordinates: {
      lat: result.lat,
      lng: result.lng
    }
  });
};

const resolveLocationFromAddress = ({
  address = {},
  fallbackLocality,
  source,
  coordinates
}) => {
  const state = address.state;
  const stateConfig = getStateConfig(state);

  if (!state || !stateConfig) {
    const error = new Error("No local language mapping found for this place yet");
    error.statusCode = 404;
    throw error;
  }

  return {
    matchedLocality: pickLocalityFromAddress(address, fallbackLocality),
    city: pickCityFromAddress(address, stateConfig.defaultCity),
    state,
    language: stateConfig.language,
    source,
    coordinates
  };
};

const buildPhraseId = (language, phrase) => (
  `${normalize(language)}-${normalize(phrase.category)}-${normalize(phrase.englishPhrase)}`
    .replaceAll(/\s+/g, "-")
);

const getPhrasesForLanguage = (language) => {
  const phrases = PHRASES_BY_LANGUAGE[language] || [];
  const languageCode = TRANSLATION_LANGUAGE_CODES[language] || "";

  return phrases.map((phrase) => ({
    id: buildPhraseId(language, phrase),
    language,
    languageCode,
    romanizedText: phrase.pronunciation,
    ...phrase
  }));
};

const findPhrasebookTranslation = (language, text) => {
  const normalizedText = normalize(text);

  return getPhrasesForLanguage(language).find((phrase) => (
    normalize(phrase.englishPhrase) === normalizedText
  ));
};

const translateWithLibreTranslate = async (text, targetCode) => {
  const response = await axios.post(process.env.TRANSLATION_API_URL, {
    q: text,
    source: "en",
    target: targetCode,
    format: "text",
    api_key: process.env.TRANSLATION_API_KEY || undefined
  }, {
    timeout: 12000
  });

  return response.data?.translatedText;
};

const translateWithMyMemory = async (text, targetCode) => {
  const response = await axios.get(MYMEMORY_TRANSLATE_URL, {
    params: {
      q: text,
      langpair: `en|${targetCode}`
    },
    timeout: 12000
  });

  return response.data?.responseData?.translatedText;
};

const KANNADA_VOWELS = {
  ಅ: "a",
  ಆ: "aa",
  ಇ: "i",
  ಈ: "ee",
  ಉ: "u",
  ಊ: "oo",
  ಎ: "e",
  ಏ: "e",
  ಐ: "ai",
  ಒ: "o",
  ಓ: "o",
  ಔ: "au"
};

const KANNADA_VOWEL_SIGNS = {
  "ಾ": "aa",
  "ಿ": "i",
  "ೀ": "ee",
  "ು": "u",
  "ೂ": "oo",
  "ೆ": "e",
  "ೇ": "e",
  "ೈ": "ai",
  "ೊ": "o",
  "ೋ": "o",
  "ೌ": "au"
};

const KANNADA_CONSONANTS = {
  ಕ: "k",
  ಖ: "kh",
  ಗ: "g",
  ಘ: "gh",
  ಚ: "ch",
  ಛ: "chh",
  ಜ: "j",
  ಝ: "jh",
  ಟ: "t",
  ಠ: "th",
  ಡ: "d",
  ಢ: "dh",
  ಣ: "n",
  ತ: "t",
  ಥ: "th",
  ದ: "d",
  ಧ: "dh",
  ನ: "n",
  ಪ: "p",
  ಫ: "ph",
  ಬ: "b",
  ಭ: "bh",
  ಮ: "m",
  ಯ: "y",
  ರ: "r",
  ಲ: "l",
  ವ: "v",
  ಶ: "sh",
  ಷ: "sh",
  ಸ: "s",
  ಹ: "h",
  ಳ: "l"
};

const KANNADA_MARKS = {
  "ಂ": "n",
  "ಃ": "h"
};

const transliterateKannada = (text) => {
  const characters = Array.from(String(text || ""));
  let romanizedText = "";

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];

    if (KANNADA_VOWELS[character]) {
      romanizedText += KANNADA_VOWELS[character];
      continue;
    }

    if (KANNADA_CONSONANTS[character]) {
      const nextCharacter = characters[index + 1];
      const vowelSign = KANNADA_VOWEL_SIGNS[nextCharacter];

      romanizedText += KANNADA_CONSONANTS[character];

      if (vowelSign) {
        romanizedText += vowelSign;
        index += 1;
      } else if (nextCharacter === "್") {
        index += 1;
      } else {
        romanizedText += "a";
      }

      continue;
    }

    if (KANNADA_MARKS[character]) {
      romanizedText += KANNADA_MARKS[character];
      continue;
    }

    if (!KANNADA_VOWEL_SIGNS[character] && character !== "್") {
      romanizedText += character;
    }
  }

  return romanizedText
    .replaceAll(/\s+/g, " ")
    .trim();
};

const romanizeTranslatedText = (language, translatedText) => {
  if (language === "Kannada") {
    return transliterateKannada(translatedText);
  }

  return "";
};

const translateEnglishText = async ({ place, text }) => {
  if (!text || !String(text).trim()) {
    const error = new Error("text is required");
    error.statusCode = 400;
    throw error;
  }

  const helper = await resolveLanguageHelper(place);
  const englishText = String(text).trim();
  const language = helper.detected.language;
  const phrasebookMatch = findPhrasebookTranslation(language, englishText);

  if (phrasebookMatch) {
    return {
      input: englishText,
      translatedText: phrasebookMatch.localPhrase,
      pronunciation: phrasebookMatch.pronunciation,
      romanizedText: phrasebookMatch.pronunciation,
      detected: helper.detected,
      source: "phrasebook"
    };
  }

  const targetCode = TRANSLATION_LANGUAGE_CODES[language];

  if (!targetCode) {
    const error = new Error(`Translation is not configured for ${language}`);
    error.statusCode = 404;
    throw error;
  }

  try {
    const translatedText = process.env.TRANSLATION_API_URL
      ? await translateWithLibreTranslate(englishText, targetCode)
      : await translateWithMyMemory(englishText, targetCode);

    if (!translatedText) {
      throw new Error("Translation API returned no translated text");
    }

    const romanizedText = romanizeTranslatedText(language, translatedText);

    return {
      input: englishText,
      translatedText,
      pronunciation: romanizedText,
      romanizedText,
      detected: helper.detected,
      source: process.env.TRANSLATION_API_URL ? "translation-api" : "mymemory-api"
    };
  } catch (error) {
    const translationError = new Error("Translation service is temporarily unavailable. Try one of the ready phrase cards.");
    translationError.statusCode = error.statusCode || 502;
    throw translationError;
  }
};

const parseLanguageHelperInput = (input) => {
  if (input && typeof input === "object") {
    const place = String(input.place || "").trim();
    const lat = input.lat;
    const lng = input.lng;

    if (lat !== undefined || lng !== undefined) {
      if (lat === undefined || lng === undefined) {
        const error = new Error("lat and lng are required together");
        error.statusCode = 400;
        throw error;
      }

      return {
        place,
        coordinates: { lat, lng },
        input: `${lat},${lng}`
      };
    }

    return { place, input: place };
  }

  const place = String(input || "").trim();
  const coordinates = parseCoordinatePair(place);

  return {
    place,
    coordinates,
    input: place
  };
};

const resolveLanguageHelper = async (input) => {
  const locationInput = parseLanguageHelperInput(input);

  if (!locationInput.place && !locationInput.coordinates) {
    const error = new Error("place is required");
    error.statusCode = 400;
    throw error;
  }

  let location;
  const predefinedLocation = locationInput.place ? findLocationMatch(locationInput.place) : null;

  try {
    location = locationInput.coordinates
      ? await resolveLocationByCoordinates(locationInput.coordinates)
      : await resolveLocationByGeocoding(locationInput.place);

    if (predefinedLocation) {
      location = {
        ...predefinedLocation,
        source: location.source
      };
    }
  } catch (error) {
    location = predefinedLocation;

    if (!location) {
      throw error;
    }
  }

  const phrases = getPhrasesForLanguage(location.language);
  const languageCode = TRANSLATION_LANGUAGE_CODES[location.language] || "";

  return {
    input: locationInput.input,
    detected: {
      locality: location.matchedLocality,
      city: location.city,
      state: location.state,
      language: location.language,
      languageCode,
      source: location.source || "predefined",
      coordinates: location.coordinates
    },
    categories: CATEGORIES,
    phrases,
    count: phrases.length
  };
};

module.exports = {
  normalize,
  findLocationMatch,
  getPhrasesForLanguage,
  resolveLanguageHelper,
  translateEnglishText
};
