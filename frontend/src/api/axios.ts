import axios from "axios";

// const TOKEN_KEY = import.meta.env.TOKEN_KEY;
// const backEndUrl = import.meta.env.IS_DEVELOPMENT ? import.meta.env.VITE_APP_JSON_URL : import.meta.env.VITE_APP_API_URL;
// VITE_APP_API_URL phải có prefix VITE_ mới đọc được trong Vite
const backEndUrl = import.meta.env.VITE_APP_API_URL ?? "http://localhost:8000/api";
const TOKEN_KEY = "token";

export const axiosInstance = axios.create({
    //     baseURL: backEndUrl ?? "http://localhost:8000/api",
    // // withCredentials: true,
    baseURL: backEndUrl,
    headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
    },
});

axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem("user");
        }
        return Promise.reject(error);
    }
);
