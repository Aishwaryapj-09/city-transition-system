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
const RECENT_LOCALITIES_KEY = "languageHelperRecentLocalities";
const LANGUAGE_LOCALES = {
  Kannada: "kn",
  Tamil: "ta",
  Telugu: "te",
  Marathi: "mr",
  Hindi: "hi"
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

function LocalLanguageHelper() {
  const [place, setPlace] = useState("");
  const [helperData, setHelperData] = useState(null);
  const [status, setStatus] = useState("");
  const [phraseSearch, setPhraseSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [favorites, setFavorites] = useState(() => readStorage(FAVORITES_KEY, []));
  const [recentPhrases, setRecentPhrases] = useState(() => readStorage(RECENT_PHRASES_KEY, []));
  const [recentLocalities, setRecentLocalities] = useState(() => readStorage(RECENT_LOCALITIES_KEY, []));

  useEffect(() => {
    writeStorage(FAVORITES_KEY, favorites);
  }, [favorites]);

  useEffect(() => {
    writeStorage(RECENT_PHRASES_KEY, recentPhrases);
  }, [recentPhrases]);

  useEffect(() => {
    writeStorage(RECENT_LOCALITIES_KEY, recentLocalities);
  }, [recentLocalities]);

  const categories = useMemo(() => {
    const detectedCategories = helperData?.categories || [];
    return ["All", ...detectedCategories];
  }, [helperData]);

  const favoriteIds = useMemo(() => new Set(favorites.map((phrase) => phrase.id)), [favorites]);

  const visiblePhrases = useMemo(() => {
    const query = phraseSearch.trim().toLowerCase();

    return (helperData?.phrases || []).filter((phrase) => {
      const matchesCategory = activeCategory === "All" || phrase.category === activeCategory;
      const searchableText = [
        phrase.englishPhrase,
        phrase.localPhrase,
        phrase.pronunciation,
        phrase.category
      ].join(" ").toLowerCase();

      return matchesCategory && (!query || searchableText.includes(query));
    });
  }, [activeCategory, helperData, phraseSearch]);

  const loadLanguageHelper = async (event, selectedPlace = place) => {
    event?.preventDefault();

    const trimmedPlace = selectedPlace.trim();

    if (!trimmedPlace) {
      setStatus("Enter a locality, area, or city name");
      return;
    }

    try {
      setStatus("Detecting city and local language...");

      const response = await API.get("/language-helper", {
        params: { place: trimmedPlace }
      });

      setHelperData(response.data);
      setActiveCategory("All");
      setPhraseSearch("");
      setStatus(`${response.data.detected.city} detected. ${response.data.detected.language} phrases loaded.`);
      rememberLocality(response.data.input, response.data.detected);
    } catch (error) {
      setHelperData(null);
      setStatus(error.response?.data?.message || error.message || "Unable to load local language helper");
    }
  };

  const rememberLocality = (input, detected) => {
    const nextEntry = {
      id: `${input}-${detected.city}`.toLowerCase(),
      input,
      city: detected.city,
      language: detected.language
    };

    setRecentLocalities((items) => [
      nextEntry,
      ...items.filter((item) => item.id !== nextEntry.id)
    ].slice(0, 6));
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

  const selectRecentLocality = (item) => {
    setPlace(item.input);
    loadLanguageHelper(null, item.input);
  };

  return (
    <main className="acc-container language-page" id="main-content">
      <a className="skip-link" href="#phrase-results">Skip to phrases</a>
      <div className="language-header">
        <div>
          <p className="eyebrow">Relocation survival phrases</p>
          <h1>Local Language Helper</h1>
          <p id="language-helper-description">Type any area or city. The helper detects the parent city and loads the local language phrases you are most likely to need first.</p>
        </div>
      </div>

      <form
        className="finder-panel language-search-panel"
        onSubmit={loadLanguageHelper}
        aria-describedby="language-helper-description"
      >
        <div className="field-block">
          <label htmlFor="language-place">Search locality or city</label>
          <input
            id="language-place"
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            placeholder="Whitefield, Tambaram, Gachibowli, Koramangala..."
            autoComplete="address-level2"
          />
        </div>
        <button className="search-btn primary-action" type="submit">
          Detect Language
        </button>
      </form>

      {recentLocalities.length > 0 && (
        <div className="recent-localities" aria-label="Recently searched localities">
          <span>Recent searches</span>
          {recentLocalities.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectRecentLocality(item)}
              aria-label={`Search ${item.input}, detected as ${item.city} ${item.language}`}
            >
              {item.input}
            </button>
          ))}
        </div>
      )}

      {status && (
        <p className="status-text" role="status" aria-live="polite">
          {status}
        </p>
      )}

      {helperData && (
        <>
          <section className="language-detection" aria-label="Detected location and language">
            <div>
              <span>Detected city</span>
              <strong>{helperData.detected.city}</strong>
              <small>{helperData.detected.state}</small>
            </div>
            <div>
              <span>Local language</span>
              <strong>{helperData.detected.language}</strong>
              <small>Matched from {helperData.detected.locality}</small>
            </div>
            <div>
              <span>Phrase set</span>
              <strong>{helperData.count}</strong>
              <small>Useful phrases loaded</small>
            </div>
          </section>

          <section className="phrase-toolbar" aria-label="Phrase filters">
            <div className="field-block phrase-search">
              <label htmlFor="phrase-search">Search phrases</label>
              <input
                id="phrase-search"
                value={phraseSearch}
                onChange={(event) => setPhraseSearch(event.target.value)}
                placeholder="Search English, translation, pronunciation..."
              />
            </div>

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
                  <p className="local-phrase" lang={LANGUAGE_LOCALES[helperData.detected.language] || "en"}>{phrase.localPhrase}</p>
                  <p className="pronunciation">Pronunciation: {phrase.pronunciation}</p>
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
            {visiblePhrases.length === 0 && (
              <p className="empty-state" role="status">
                No phrases match your search.
              </p>
            )}
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
