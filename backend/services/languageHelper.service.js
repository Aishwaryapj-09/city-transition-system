const {
  CATEGORIES,
  LOCATION_MAPPINGS,
  PHRASES_BY_LANGUAGE
} = require("../data/languageHelper.data");

const normalize = (value = "") => (
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
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

  return matchedWords.length ? 40 + matchedWords.length * 10 : 0;
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

const buildPhraseId = (language, phrase) => (
  `${normalize(language)}-${normalize(phrase.category)}-${normalize(phrase.englishPhrase)}`
    .replace(/\s+/g, "-")
);

const getPhrasesForLanguage = (language) => {
  const phrases = PHRASES_BY_LANGUAGE[language] || [];

  return phrases.map((phrase) => ({
    id: buildPhraseId(language, phrase),
    language,
    ...phrase
  }));
};

const resolveLanguageHelper = (place) => {
  if (!place || !String(place).trim()) {
    const error = new Error("place is required");
    error.statusCode = 400;
    throw error;
  }

  const location = findLocationMatch(place);

  if (!location) {
    const error = new Error("No city or language mapping found for this place yet");
    error.statusCode = 404;
    throw error;
  }

  const phrases = getPhrasesForLanguage(location.language);

  return {
    input: String(place).trim(),
    detected: {
      locality: location.matchedLocality,
      city: location.city,
      state: location.state,
      language: location.language
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
  resolveLanguageHelper
};
