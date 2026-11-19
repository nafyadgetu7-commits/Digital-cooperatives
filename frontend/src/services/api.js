import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:5000/api",
    timeout: 30000
});

// ============================================================
// REQUEST INTERCEPTOR
// ============================================================

api.interceptors.request.use(
    (config) => {

        // IMPORTANT:
        // Use sessionStorage because AuthContext uses
        // sessionStorage for tab-specific authentication.
        const token = sessionStorage.getItem("token");

        console.log(
            "API REQUEST:",
            config.method?.toUpperCase(),
            config.url
        );

        if (token) {

            console.log("TOKEN: Token exists");

            config.headers = config.headers || {};

            config.headers.Authorization =
                `Bearer ${token}`;

        } else {

            console.log("TOKEN: No token");
        }

        // Do not manually set Content-Type.
        // Axios handles JSON and FormData automatically.

        return config;
    },

    (error) => {
        return Promise.reject(error);
    }
);

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================

api.interceptors.response.use(

    (response) => {

        console.log(
            "API RESPONSE:",
            response.status,
            response.config.url
        );

        return response;
    },

    (error) => {

        console.error(
            "API ERROR:",
            error.config?.url
        );

        console.error(
            "Status:",
            error.response?.status
        );

        console.error(
            "URL:",
            error.config?.url
        );

        console.error(
            "Data:",
            error.response?.data
        );

        // ====================================================
        // SERVER NOT REACHABLE
        // ====================================================

        if (!error.response) {

            console.error(
                "SERVER CONNECTION ERROR:",
                error.message
            );

            console.error(
                "Make sure backend is running on:",
                "http://localhost:5000"
            );
        }

        // ====================================================
        // AUTHENTICATION ERROR
        // ====================================================

        if (error.response?.status === 401) {

            console.log(
                "Authentication failed."
            );

            // IMPORTANT:
            // Must use sessionStorage to match AuthContext.
            sessionStorage.removeItem("token");
            sessionStorage.removeItem("user");

            // Don't redirect automatically.
            // PrivateRoute will handle authentication.
        }

        return Promise.reject(error);
    }
);

export default api;