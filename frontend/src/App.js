import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AddListing from "./pages/AddListing";
import Listings from "./pages/Listings";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Listings />} />
        <Route
          path="/add"
          element={
            <ProtectedRoute>
              <AddListing />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;