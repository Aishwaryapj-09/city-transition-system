import { render, screen } from '@testing-library/react';
import App from './App';

test('renders city transition landing page', () => {
  render(<App />);
  const linkElement = screen.getByText(/City Transition System/i);
  expect(linkElement).toBeInTheDocument();
});
