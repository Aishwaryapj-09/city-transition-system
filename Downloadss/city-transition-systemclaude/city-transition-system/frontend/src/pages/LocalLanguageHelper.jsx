import React, { useEffect, useMemo, useState } from "react";
import API from "../services/api";

const CATEGORY_META = {
  "Basic Conversation": { icon: "Hi", tone: "conversation" },
  Transport: { icon: "Go", tone: "transport" },
  Emergency: { icon: "SOS", tone: "emergency" },
  "Food & Shopping": { icon: "Rs", tone: "shopping" }
};

const FAVORITES_KEY = "languageHelperFavorites";
const RECENT_PHRASES_KEY = "languageHelperRecentPhrases";
const LANGUAGE_LOCALES = {
  Kannada: "kn",
  Tamil: "ta",
  Telugu: "te",
  Marathi: "mr",
  Hindi: "hi",
  Malayalam: "ml",
  Gujarati: "gu",
  Bengali: "bn",
  Punjabi: "pa",
  Odia: "or",
  Assamese: "as",
  Konkani: "kok"
};

const readStorage = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const getEnglishLetters = (item) => item?.romanizedText || item?.pronunciation || "";

function LocalLanguageHelper() {
  const [place, setPlace] = useState("");
  const [coordinates, setCoordinates] = useState(null);
  const [helperData, setHelperData] = useState(null);
  const [status, setStatus] = useState("");
  const [customText, setCustomText] = useState("");
  const [translation, setTranslation] = useState(null);
  const [translationStatus, setTranslationStatus] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [favorites, setFavorites] = useState(() => readStorage(FAVORITES_KEY, []));
  const [recentPhrases, setRecentPhrases] = useState(() => readStorage(RECENT_PHRASES_KEY, []));

  useEffect(() => {
    writeStorage(FAVORITES_KEY, favorites);
  }, [favorites]);

  useEffect(() => {
    writeStorage(RECENT_PHRASES_KEY, recentPhrases);
  }, [recentPhrases]);

  const categories = useMemo(() => {
    const detectedCategories = helperData?.categories || [];
    return ["All", ...detectedCategories];
  }, [helperData]);

  const favoriteIds = useMemo(() => new Set(favorites.map((phrase) => phrase.id)), [favorites]);

  const visiblePhrases = useMemo(() => {
    return (helperData?.phrases || []).filter((phrase) => {
      return activeCategory === "All" || phrase.category === activeCategory;
    });
  }, [activeCategory, helperData]);

  const loadLanguageHelper = async (event, selectedPlace = place, selectedCoordinates = coordinates) => {
    event?.preventDefault();

    const trimmedPlace = selectedPlace.trim();
    const params = selectedCoordinates
      ? {
          lat: selectedCoordinates.lat,
          lng: selectedCoordinates.lng
        }
      : { place: trimmedPlace };

    if (!trimmedPlace && !selectedCoordinates) {
      setStatus("Enter a locality, area, or city name, or use your current location");
      return;
    }

    try {
      setStatus("Locating state and local language...");

      const response = await API.get("/language-helper", {
        params
      });

      setHelperData(response.data);
      setActiveCategory("All");
      setTranslation(null);
      setTranslationStatus("");
      setStatus(`${response.data.detected.city} detected. ${response.data.detected.language} (${response.data.detected.languageCode}) phrases loaded.`);
    } catch (error) {
      setHelperData(null);
      setStatus(error.response?.data?.message || error.message || "Unable to load local language helper");
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus("Current location is not available in this browser");
      return;
    }

    setStatus("Getting your current location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoordinates = {
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6)
        };

        setCoordinates(nextCoordinates);
        setPlace("");
        loadLanguageHelper(null, "", nextCoordinates);
      },
      () => {
        setStatus("Location permission was blocked. Allow location access or enter a place name.");
      }
    );
  };

  const usePlaceSearch = (event) => {
    setPlace(event.target.value);
    setCoordinates(null);
  };

  const clearCurrentLocation = () => {
    setCoordinates(null);
    setHelperData(null);
    setTranslation(null);
    setStatus("");
  };

  const translateCustomText = async (event) => {
    event.preventDefault();

    if (!helperData) {
      setTranslationStatus("Detect a place first");
      return;
    }

    const trimmedText = customText.trim();

    if (!trimmedText) {
      setTranslationStatus("Enter an English sentence to translate");
      return;
    }

    try {
      setTranslationStatus("Translating to local language...");

      const response = await API.post("/language-helper/translate", {
        place: helperData.input,
        text: trimmedText
      });

      setTranslation(response.data);
      setTranslationStatus(`Translated to ${response.data.detected.language}`);
    } catch (error) {
      setTranslation(null);
      setTranslationStatus(error.response?.data?.message || error.message || "Unable to translate this sentence");
    }
  };

  const rememberPhrase = (phrase) => {
    setRecentPhrases((items) => [
      phrase,
      ...items.filter((item) => item.id !== phrase.id)
    ].slice(0, 6));
  };

  const toggleFavorite = (phrase) => {
    rememberPhrase(phrase);

    if (favoriteIds.has(phrase.id)) {
      setFavorites((items) => items.filter((item) => item.id !== phrase.id));
      return;
    }

    setFavorites((items) => [phrase, ...items].slice(0, 30));
  };

  const speakPhrase = (phrase) => {
    rememberPhrase(phrase);

    if (!window.speechSynthesis) {
      setStatus("Text-to-speech is not available in this browser");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(phrase.pronunciation);
    utterance.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <main className="acc-container language-page" id="main-content">
      <a className="skip-link" href="#phrase-results">Skip to phrases</a>
      <div className="language-header">
        <div>
          <p className="eyebrow">Relocation survival phrases</p>
          <h1>Local Language Helper</h1>
          <p id="language-helper-description">Enter an area, city, or landmark. The helper locates its state and loads the local language phrases you are most likely to need first.</p>
        </div>
      </div>

      <form
        className="finder-panel language-search-panel"
        onSubmit={loadLanguageHelper}
        aria-describedby="language-helper-description"
      >
        <div className="field-block">
          <label htmlFor="language-place">Enter place</label>
          <input
            id="language-place"
            value={place}
            onChange={usePlaceSearch}
            placeholder="Whitefield, Kochi, Ahmedabad, Panaji..."
            autoComplete="address-level2"
            disabled={Boolean(coordinates)}
          />
        </div>
        <div className="action-row">
          <button className="loc-btn" type="button" onClick={useCurrentLocation}>
            Use My Location
          </button>
          {coordinates && (
            <button className="clear-btn" type="button" onClick={clearCurrentLocation}>
              Clear Location
            </button>
          )}
        </div>
        {coordinates && (
          <p className="status-text compact-status">Current location selected</p>
        )}
        <button className="search-btn primary-action" type="submit">
          Find State & Language
        </button>
      </form>

      {status && (
        <p className="status-text" role="status" aria-live="polite">
          {status}
        </p>
      )}

      {helperData && (
        <>
          <section className="language-detection" aria-label="Detected location and language">
            <div>
              <span>Detected place</span>
              <strong>{helperData.detected.city}</strong>
              <small>{helperData.detected.state}</small>
            </div>
            <div>
              <span>Local language</span>
              <strong>{helperData.detected.language}</strong>
              <small>Mapped from {helperData.detected.state}</small>
            </div>
            <div>
              <span>Language code</span>
              <strong>{helperData.detected.languageCode}</strong>
              <small>Used for translations</small>
            </div>
            <div>
              <span>Phrase set</span>
              <strong>{helperData.count}</strong>
              <small>Useful phrases loaded</small>
            </div>
          </section>

          <section className="custom-translation-panel" aria-label="Translate custom English sentence">
            <div>
              <h2>Translate Your Sentence</h2>
              <p>Type what you need to say in English. It will use the detected local language for this place.</p>
            </div>
            <form onSubmit={translateCustomText}>
              <label htmlFor="custom-translation-text">English sentence</label>
              <textarea
                id="custom-translation-text"
                value={customText}
                onChange={(event) => setCustomText(event.target.value)}
                placeholder="I need help finding a rented room near this area"
                rows="3"
              />
              <button className="search-btn primary-action" type="submit">
                Translate
              </button>
            </form>
            {translationStatus && (
              <p className="status-text compact-status" role="status" aria-live="polite">
                {translationStatus}
              </p>
            )}
            {translation && (
              <article className="translation-result">
                <span>{translation.source === "phrasebook" ? "Matched phrasebook" : "API translation"}</span>
                <strong lang={translation.detected.languageCode || LANGUAGE_LOCALES[translation.detected.language] || "en"}>{translation.translatedText}</strong>
                {getEnglishLetters(translation) && (
                  <p className="english-letters">English letters: {getEnglishLetters(translation)}</p>
                )}
              </article>
            )}
          </section>

          <section className="phrase-toolbar categories-only" aria-label="Phrase filters">
            <div className="category-tabs" role="tablist" aria-label="Phrase categories">
              {categories.map((category) => {
                const meta = CATEGORY_META[category] || { icon: "All", tone: "all" };
                const selected = activeCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="phrase-results"
                    className={selected ? "active" : ""}
                    onClick={() => setActiveCategory(category)}
                  >
                    <span className={`category-icon ${meta.tone}`} aria-hidden="true">{meta.icon}</span>
                    {category}
                  </button>
                );
              })}
            </div>
          </section>

          <section
            className="phrase-results"
            id="phrase-results"
            role="tabpanel"
            aria-label="Language phrases"
            tabIndex="-1"
          >
            <div className="results-heading">
              <h2>{activeCategory === "All" ? "All Phrases" : activeCategory}</h2>
              <span>{visiblePhrases.length} shown</span>
            </div>

            <div className="phrase-grid">
              {visiblePhrases.map((phrase) => (
                <article
                  className="phrase-card"
                  key={phrase.id}
                  onMouseEnter={() => rememberPhrase(phrase)}
                  onFocus={() => rememberPhrase(phrase)}
                  tabIndex="0"
                  aria-labelledby={`${phrase.id}-english`}
                >
                  <div className="phrase-card-top">
                    <span
                      className={`category-icon ${CATEGORY_META[phrase.category]?.tone || "all"}`}
                      aria-hidden="true"
                    >
                      {CATEGORY_META[phrase.category]?.icon || "Go"}
                    </span>
                    <span>{phrase.category}</span>
                  </div>
                  <p className="english-phrase" id={`${phrase.id}-english`}>{phrase.englishPhrase}</p>
                  <p className="local-phrase" lang={helperData.detected.languageCode || LANGUAGE_LOCALES[helperData.detected.language] || "en"}>{phrase.localPhrase}</p>
                  <p className="pronunciation">English letters: {getEnglishLetters(phrase)}</p>
                  <div className="phrase-actions">
                    <button
                      type="button"
                      onClick={() => toggleFavorite(phrase)}
                      aria-pressed={favoriteIds.has(phrase.id)}
                      aria-label={`${favoriteIds.has(phrase.id) ? "Remove saved phrase" : "Save phrase"}: ${phrase.englishPhrase}`}
                    >
                      {favoriteIds.has(phrase.id) ? "Saved" : "Save"}
                    </button>
                    <button
                      type="button"
                      className="listen-btn"
                      onClick={() => speakPhrase(phrase)}
                      aria-label={`Listen to pronunciation for ${phrase.englishPhrase}`}
                    >
                      Listen
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="language-side-lists" aria-label="Saved and recently viewed phrases">
            <div>
              <h2>Favorites</h2>
              {favorites.length ? (
                favorites.slice(0, 6).map((phrase) => (
                  <button
                    key={phrase.id}
                    type="button"
                    onClick={() => rememberPhrase(phrase)}
                    aria-label={`Favorite phrase ${phrase.englishPhrase}`}
                  >
                    <strong>{phrase.englishPhrase}</strong>
                    <span>{phrase.localPhrase}</span>
                  </button>
                ))
              ) : (
                <p>No saved phrases yet.</p>
              )}
            </div>

            <div>
              <h2>Recently Viewed</h2>
              {recentPhrases.length ? (
                recentPhrases.map((phrase) => (
                  <button
                    key={phrase.id}
                    type="button"
                    onClick={() => speakPhrase(phrase)}
                    aria-label={`Replay recently viewed phrase ${phrase.englishPhrase}`}
                  >
                    <strong>{phrase.englishPhrase}</strong>
                    <span>{phrase.pronunciation}</span>
                  </button>
                ))
              ) : (
                <p>Open or save phrases to build a quick recall list.</p>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export default LocalLanguageHelper;
