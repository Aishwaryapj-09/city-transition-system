import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LocalLanguageHelper from "./LocalLanguageHelper";
import API from "../services/api";

jest.mock("../services/api", () => ({
  get: jest.fn()
}));

const helperResponse = {
  input: "Whitefield",
  detected: {
    locality: "Whitefield",
    city: "Bangalore",
    state: "Karnataka",
    language: "Kannada"
  },
  categories: ["Basic Conversation", "Transport", "Emergency", "Food & Shopping"],
  phrases: [
    {
      id: "kannada-basic-conversation-thank-you",
      language: "Kannada",
      category: "Basic Conversation",
      englishPhrase: "Thank you",
      localPhrase: "ಧನ್ಯವಾದಗಳು",
      pronunciation: "Dhanyavaadagalu"
    }
  ],
  count: 1
};

beforeEach(() => {
  localStorage.clear();
  API.get.mockReset();
});

test("renders accessible controls and loaded phrase actions", async () => {
  API.get.mockResolvedValue({ data: helperResponse });

  render(<LocalLanguageHelper />);

  fireEvent.change(screen.getByLabelText(/search locality or city/i), {
    target: { value: "Whitefield" }
  });
  fireEvent.click(screen.getByRole("button", { name: /detect language/i }));

  expect(API.get).toHaveBeenCalledWith("/language-helper", {
    params: { place: "Whitefield" }
  });

  await waitFor(() => {
    expect(screen.getByRole("status")).toHaveTextContent("Bangalore detected");
  });
  expect(screen.getByText("Kannada")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /basic conversation/i })).toHaveAttribute("aria-selected", "false");

  const saveButton = screen.getByRole("button", { name: /save phrase: thank you/i });
  expect(saveButton).toHaveAttribute("aria-pressed", "false");

  fireEvent.click(saveButton);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: /remove saved phrase: thank you/i })).toHaveAttribute("aria-pressed", "true");
  });
});
