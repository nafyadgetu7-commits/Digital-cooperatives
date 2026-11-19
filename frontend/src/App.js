import React from "react";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";

import { AuthProvider, useAuth } from "./context/AuthContext";

// ============================================================
// AUTHENTICATION
// ============================================================

import Register from "./components/auth/Register";
import Login from "./components/auth/Login";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";

// ============================================================
// CUSTOMER
// ============================================================

import CustomerDashboard from "./components/customer/CustomerDashboard";
import Products from "./components/customer/Products";
import Orders from "./components/customer/Orders";
import Reviews from "./components/customer/Reviews";
import Cart from "./components/customer/Cart";


// ============================================================
// OTHER DASHBOARDS
// ============================================================

import SupplierDashboard from "./components/supplier/SupplierDashboard";
import MemberDashboard from "./components/member/MemberDashboard";
import AccountantDashboard from "./components/accountant/AccountantDashboard";
import ManagerDashboard from "./components/manager/ManagerDashboard";
import AdminDashboard from "./components/admin/AdminDashboard";
import SupplierOrderDetails from "./components/supplier/SupplierOrderDetails";

// ============================================================
// SECURITY
// ============================================================

import PrivateRoute from "./components/common/PrivateRoute";

// ============================================================
// APP ROUTES
// ============================================================

function AppRoutes() {
  const { user, loading } = useAuth();

  // ============================================================
  // AUTH LOADING
  // ============================================================

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{
          height: "100vh",
          backgroundColor: "#f5f7fb",
        }}
      >
        <div className="text-center">
          <div
            className="spinner-border text-primary"
            role="status"
            style={{
              width: "3rem",
              height: "3rem",
            }}
          >
            <span className="visually-hidden">
              Loading...
            </span>
          </div>

          <p className="mt-3 text-muted">
            Loading application...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // DASHBOARD BASED ON ROLE
  // ============================================================

  const getDashboard = () => {
    const roleId = Number(user?.role_id);

    switch (roleId) {
      case 1:
        return <AdminDashboard />;

      case 2:
        return <ManagerDashboard />;

      case 3:
        return <AccountantDashboard />;

      case 4:
        return <SupplierDashboard />;

      case 5:
        return <CustomerDashboard />;

      case 6:
        return <MemberDashboard />;

      default:
        return (
          <Navigate
            to="/login"
            replace
          />
        );
    }
  };

  // ============================================================
  // ROUTES
  // ============================================================

  return (
    <Routes>

      {/* ======================================================
          AUTHENTICATION
      ====================================================== */}

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />
      <Route
    path="/forgot-password"
    element={<ForgotPassword />}
/>

<Route
    path="/reset-password/:token"
    element={<ResetPassword />}
/>

      {/* ======================================================
          MAIN PAGE
      ====================================================== */}

      <Route
        path="/"
        element={
          <PrivateRoute>
            {getDashboard()}
          </PrivateRoute>
        }
      />

      {/* ======================================================
          ADMIN
      ====================================================== */}

      <Route
        path="/admin/*"
        element={
          <PrivateRoute
            allowedRoles={[1]}
          >
            <AdminDashboard />
          </PrivateRoute>
        }
      />

      {/* ======================================================
          MANAGER
      ====================================================== */}

      <Route
        path="/manager/*"
        element={
          <PrivateRoute
            allowedRoles={[2]}
          >
            <ManagerDashboard />
          </PrivateRoute>
        }
      />

      {/* ======================================================
          ACCOUNTANT
      ====================================================== */}

      <Route
        path="/accountant/*"
        element={
          <PrivateRoute
            allowedRoles={[3]}
          >
            <AccountantDashboard />
          </PrivateRoute>
        }
      />

      {/* ======================================================
          SUPPLIER
      ====================================================== */}

      <Route
        path="/supplier/*"
        element={
          <PrivateRoute
            allowedRoles={[4]}
          >
            <SupplierDashboard />
          </PrivateRoute>
        }
      />
    <Route
    path="/supplier/orders"
    element={<SupplierOrderDetails />}
/>
      {/* ======================================================
          CUSTOMER DASHBOARD
      ====================================================== */}

      <Route
        path="/customer"
        element={
          <PrivateRoute
            allowedRoles={[5]}
          >
            <CustomerDashboard />
          </PrivateRoute>
        }
      />

      {/* ======================================================
          CUSTOMER PRODUCTS
      ====================================================== */}

      <Route
        path="/customer/products"
        element={
          <PrivateRoute
            allowedRoles={[5]}
          >
            <Products />
          </PrivateRoute>
        }
      />

      {/* ======================================================
          CUSTOMER CART
      ====================================================== */}

      <Route
        path="/customer/cart"
        element={
          <PrivateRoute
            allowedRoles={[5]}
          >
            <Cart />
          </PrivateRoute>
        }
      />

      {/* ======================================================
          CUSTOMER ORDERS
      ====================================================== */}

      <Route
        path="/customer/orders"
        element={
          <PrivateRoute
            allowedRoles={[5]}
          >
            <Orders />
          </PrivateRoute>
        }
      />

      {/* ======================================================
          CUSTOMER REVIEWS
      ====================================================== */}

      <Route
        path="/customer/reviews"
        element={
          <PrivateRoute
            allowedRoles={[5]}
          >
            <Reviews />
          </PrivateRoute>
        }
      />

      {/* ======================================================
          MEMBER
      ====================================================== */}

      <Route
        path="/member/*"
        element={
          <PrivateRoute
            allowedRoles={[6]}
          >
            <MemberDashboard />
          </PrivateRoute>
        }
      />

      {/* ======================================================
          UNKNOWN ROUTE
      ====================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
}

// ============================================================
// MAIN APP
// ============================================================

function App() {
  return (
    <AuthProvider>
      <Router>

        <AppRoutes />

        <ToastContainer
          position="top-right"
          autoClose={3000}
          newestOnTop
          closeOnClick
          pauseOnHover
        />

      </Router>
    </AuthProvider>
  );
}

export default App;