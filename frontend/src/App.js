import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Accommodation from "./pages/Accommodation";
import NearbyEssentials from "./pages/NearbyEssentials";
import Listings from "./pages/Listings";
import AddListing from "./pages/AddListing";
import MyListings from "./pages/MyListings";
import VerifyListings from "./pages/VerifyListings";
import "./App.css";


/* ---------------- PROTECTED ROUTE ---------------- */

function ProtectedRoute({ children }) {

  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" />;
  }

  return children;
}


/* ---------------- OWNER ROUTE ---------------- */

function OwnerRoute({ children }) {

  const role = localStorage.getItem("role");

  if (role !== "owner") {
    return <Navigate to="/dashboard" />;
  }

  return children;
}


/* ---------------- ADMIN ROUTE ---------------- */

function AdminRoute({ children }) {

  const role = localStorage.getItem("role");

  if (role !== "admin") {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

function FallbackRoute() {
  const token = localStorage.getItem("token");

  return <Navigate to={token ? "/dashboard" : "/"} />;
}


/* ---------------- APP ---------------- */

function App() {

  return (

    <BrowserRouter>

      <Routes>

        {/* PUBLIC ROUTES */}

        <Route path="/" element={<Landing />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />


        {/* DASHBOARD */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />


        {/* VISITOR FEATURE - ACCOMMODATION */}

        <Route
          path="/accommodation"
          element={
            <ProtectedRoute>
              <Accommodation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nearby-essentials"
          element={
            <ProtectedRoute>
              <NearbyEssentials />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nearby"
          element={
            <ProtectedRoute>
              <NearbyEssentials />
            </ProtectedRoute>
          }
        />


        {/* GENERAL LISTINGS VIEW */}

        <Route
          path="/listings"
          element={
            <ProtectedRoute>
              <Listings />
            </ProtectedRoute>
          }
        />


        {/* OWNER - ADD LISTING */}

        <Route
          path="/add-listing"
          element={
            <ProtectedRoute>
              <OwnerRoute>
                <AddListing />
              </OwnerRoute>
            </ProtectedRoute>
          }
        />


        {/* OWNER - MY LISTINGS */}

        <Route
          path="/my-listings"
          element={
            <ProtectedRoute>
              <OwnerRoute>
                <MyListings />
              </OwnerRoute>
            </ProtectedRoute>
          }
        />


        {/* ADMIN - VERIFY LISTINGS */}

        <Route
          path="/verify-listings"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <VerifyListings />
              </AdminRoute>
            </ProtectedRoute>
          }
        />


        {/* FALLBACK ROUTE */}

        <Route path="*" element={<FallbackRoute />} />

      </Routes>

    </BrowserRouter>

  );

}

export default App;
