import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LocalLanguageHelper from "./LocalLanguageHelper";
import API from "../services/api";

jest.mock("../services/api", () => ({
  get: jest.fn(),
  post: jest.fn()
}));

const helperResponse = {
  input: "Whitefield",
  detected: {
    locality: "Whitefield",
    city: "Bangalore",
    state: "Karnataka",
    language: "Kannada",
    languageCode: "kn"
  },
  categories: ["Basic Conversation", "Transport", "Emergency", "Food & Shopping"],
  phrases: [
    {
      id: "kannada-basic-conversation-thank-you",
      language: "Kannada",
      category: "Basic Conversation",
      englishPhrase: "Thank you",
      localPhrase: "ಧನ್ಯವಾದಗಳು",
      pronunciation: "Dhanyavaadagalu",
      romanizedText: "Dhanyavaadagalu"
    }
  ],
  count: 1
};

beforeEach(() => {
  localStorage.clear();
  API.get.mockReset();
  API.post.mockReset();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: undefined
  });
});

test("renders accessible controls and loaded phrase actions", async () => {
  API.get.mockResolvedValue({ data: helperResponse });

  render(<LocalLanguageHelper />);

  fireEvent.change(screen.getByLabelText(/enter place/i), {
    target: { value: "Whitefield" }
  });
  fireEvent.click(screen.getByRole("button", { name: /find state & language/i }));

  expect(API.get).toHaveBeenCalledWith("/language-helper", {
    params: { place: "Whitefield" }
  });

  await waitFor(() => {
    expect(screen.getByRole("status")).toHaveTextContent("Bangalore detected");
  });
  expect(screen.getByText("Kannada")).toBeInTheDocument();
  expect(screen.getByText("kn")).toBeInTheDocument();
  expect(screen.getByText("English letters: Dhanyavaadagalu")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /basic conversation/i })).toHaveAttribute("aria-selected", "false");

  const saveButton = screen.getByRole("button", { name: /save phrase: thank you/i });
  expect(saveButton).toHaveAttribute("aria-pressed", "false");

  fireEvent.click(saveButton);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: /remove saved phrase: thank you/i })).toHaveAttribute("aria-pressed", "true");
  });
});

test("detects language using current location coordinates", async () => {
  API.get.mockResolvedValue({
    data: {
      ...helperResponse,
      input: "12.971599,77.594566",
      detected: {
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
      }
    }
  });
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: jest.fn((success) => success({
        coords: {
          latitude: 12.971599,
          longitude: 77.594566
        }
      }))
    }
  });

  render(<LocalLanguageHelper />);

  fireEvent.click(screen.getByRole("button", { name: /use my location/i }));

  await waitFor(() => {
    expect(API.get).toHaveBeenCalledWith("/language-helper", {
      params: {
        lat: "12.971599",
        lng: "77.594566"
      }
    });
  });
  await waitFor(() => {
    expect(screen.getByText("Bengaluru")).toBeInTheDocument();
  });
  expect(screen.getByText("kn")).toBeInTheDocument();
});

test("keeps use my location available after typing a place", () => {
  render(<LocalLanguageHelper />);

  fireEvent.change(screen.getByLabelText(/enter place/i), {
    target: { value: "Whitefield" }
  });

  expect(screen.getByRole("button", { name: /use my location/i })).toBeEnabled();
});

test("translates custom English text using the detected place", async () => {
  API.get.mockResolvedValue({ data: helperResponse });
  API.post.mockResolvedValue({
    data: {
      input: "I need a rented room",
      translatedText: "ನನಗೆ ಬಾಡಿಗೆ ಕೊಠಡಿ ಬೇಕು",
      pronunciation: "",
      detected: helperResponse.detected,
      source: "mymemory-api"
    }
  });

  render(<LocalLanguageHelper />);

  fireEvent.change(screen.getByLabelText(/enter place/i), {
    target: { value: "Whitefield" }
  });
  fireEvent.click(screen.getByRole("button", { name: /find state & language/i }));

  await waitFor(() => {
    expect(screen.getByText("Translate Your Sentence")).toBeInTheDocument();
  });

  fireEvent.change(screen.getByRole("textbox", { name: "English sentence" }), {
    target: { value: "I need a rented room" }
  });
  fireEvent.click(screen.getByRole("button", { name: /^translate$/i }));

  expect(API.post).toHaveBeenCalledWith("/language-helper/translate", {
    place: "Whitefield",
    text: "I need a rented room"
  });

  await waitFor(() => {
    expect(screen.getByText("ನನಗೆ ಬಾಡಿಗೆ ಕೊಠಡಿ ಬೇಕು")).toBeInTheDocument();
  });
});

test("shows English letters below phrasebook translation", async () => {
  API.get.mockResolvedValue({ data: helperResponse });
  API.post.mockResolvedValue({
    data: {
      input: "Thank you",
      translatedText: "à²§à²¨à³à²¯à²µà²¾à²¦à²—à²³à³",
      pronunciation: "Dhanyavaadagalu",
      romanizedText: "Dhanyavaadagalu",
      detected: helperResponse.detected,
      source: "phrasebook"
    }
  });

  render(<LocalLanguageHelper />);

  fireEvent.change(screen.getByLabelText(/enter place/i), {
    target: { value: "Whitefield" }
  });
  fireEvent.click(screen.getByRole("button", { name: /find state & language/i }));

  await waitFor(() => {
    expect(screen.getByText("Translate Your Sentence")).toBeInTheDocument();
  });

  fireEvent.change(screen.getByRole("textbox", { name: "English sentence" }), {
    target: { value: "Thank you" }
  });
  fireEvent.click(screen.getByRole("button", { name: /^translate$/i }));

  await waitFor(() => {
    expect(screen.getAllByText("English letters: Dhanyavaadagalu").length).toBeGreaterThan(0);
  });
});
