import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // LOAD SAVED USER
  // ============================================================

  useEffect(() => {
    try {
      // ----------------------------------------------------------
      // IMPORTANT:
      // Authentication is stored per browser TAB.
      // ----------------------------------------------------------

      const token = sessionStorage.getItem("token");
      const savedUser = sessionStorage.getItem("user");

      console.log("AUTH INITIALIZATION");
      console.log("SESSION TOKEN:", !!token);
      console.log("SESSION USER:", savedUser);

      if (token && savedUser) {
        const parsedUser = JSON.parse(savedUser);

        if (parsedUser && parsedUser.id) {
          // Make role_id consistently numeric
          const normalizedUser = {
            ...parsedUser,
            role_id:
              parsedUser.role_id !== undefined &&
              parsedUser.role_id !== null
                ? Number(parsedUser.role_id)
                : parsedUser.role_id
          };

          setUser(normalizedUser);

          // Save normalized user
          sessionStorage.setItem(
            "user",
            JSON.stringify(normalizedUser)
          );

          console.log(
            "RESTORED AUTH USER:",
            normalizedUser
          );
        } else {
          console.warn(
            "Saved user is invalid. Clearing session."
          );

          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");
        }
      }
    } catch (error) {
      console.error(
        "AUTH INITIALIZATION ERROR:",
        error
      );

      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================
  // LOGIN
  // ============================================================

  const login = async (email, password) => {
    try {
      console.log("LOGIN ATTEMPT:", email);

      const response = await api.post(
        "/auth/login",
        {
          email,
          password
        }
      );

      console.log(
        "BACKEND LOGIN RESPONSE:",
        response.data
      );

      // ----------------------------------------------------------
      // Check backend response
      // ----------------------------------------------------------

      if (
        !response.data ||
        response.data.success !== true
      ) {
        return {
          success: false,
          message:
            response.data?.message ||
            "Login failed"
        };
      }

      const token = response.data.token;
      const loggedInUser = response.data.user;

      // ----------------------------------------------------------
      // Validate token
      // ----------------------------------------------------------

      if (!token) {
        console.error(
          "LOGIN ERROR: Token was not returned."
        );

        return {
          success: false,
          message:
            "Login succeeded but token was not returned."
        };
      }

      // ----------------------------------------------------------
      // Validate user
      // ----------------------------------------------------------

      if (
        !loggedInUser ||
        !loggedInUser.id
      ) {
        console.error(
          "LOGIN ERROR: User information was not returned."
        );

        return {
          success: false,
          message:
            "Login succeeded but user information was not returned."
        };
      }

      // ----------------------------------------------------------
      // Normalize user
      // ----------------------------------------------------------

      const normalizedUser = {
        ...loggedInUser,

        role_id:
          loggedInUser.role_id !== undefined &&
          loggedInUser.role_id !== null
            ? Number(loggedInUser.role_id)
            : loggedInUser.role_id
      };

      // ----------------------------------------------------------
      // Clear old session first
      // ----------------------------------------------------------

      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");

      // ----------------------------------------------------------
      // Save authentication for THIS TAB ONLY
      // ----------------------------------------------------------

      sessionStorage.setItem(
        "token",
        token
      );

      sessionStorage.setItem(
        "user",
        JSON.stringify(normalizedUser)
      );

      // ----------------------------------------------------------
      // Update React state
      // ----------------------------------------------------------

      setUser(normalizedUser);

      console.log(
        "AUTH USER:",
        normalizedUser
      );

      console.log(
        "AUTH ROLE ID:",
        normalizedUser.role_id
      );

      return {
        success: true,
        user: normalizedUser,
        token: token,
        message:
          response.data.message ||
          "Login successful"
      };
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      let message =
        "Login failed. Please try again.";

      if (error.response) {
        message =
          error.response.data?.message ||
          `Login failed (${error.response.status})`;
      } else if (error.request) {
        message =
          "Cannot connect to the server. Please check that the backend is running.";
      } else if (error.message) {
        message = error.message;
      }

      return {
        success: false,
        message
      };
    }
  };

  // ============================================================
  // REGISTER
  // ============================================================

  const register = async (userData) => {
    try {
      console.log(
        "REGISTER DATA:",
        userData
      );

      const response = await api.post(
        "/auth/register",
        userData
      );

      console.log(
        "REGISTER RESPONSE:",
        response.data
      );

      if (
        response.data &&
        response.data.success === true
      ) {
        return {
          success: true,

          message:
            response.data.message ||
            "Registration successful",

          userId:
            response.data.userId
        };
      }

      return {
        success: false,

        message:
          response.data?.message ||
          "Registration failed"
      };
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      let message =
        "Registration failed. Please try again.";

      if (error.response) {
        message =
          error.response.data?.message ||
          `Registration failed (${error.response.status})`;
      } else if (error.request) {
        message =
          "Cannot connect to the server. Please check that the backend is running.";
      } else if (error.message) {
        message = error.message;
      }

      return {
        success: false,
        message
      };
    }
  };

  // ============================================================
  // LOGOUT
  // ============================================================

  const logout = () => {
    console.log("LOGGING OUT");

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    setUser(null);
  };

  // ============================================================
  // CONTEXT
  // ============================================================

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================
// USE AUTH
// ============================================================

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
};

export default AuthContext;