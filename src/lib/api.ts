export const getApiUrl = () => {
    const stored = localStorage.getItem("api_url");
    // Only use stored URL if explicitly set and not ngrok (which may be stale)
    if (stored && !stored.includes("ngrok")) {
        return stored;
    }
    // Default: empty string = relative URL, Vite proxy forwards to localhost:3000
    return "";
};

export const setApiUrl = (url: string) => {
    localStorage.setItem("api_url", url);
};

// Wrapper global de fetch com header ngrok para todas as requisições
export const apiFetch = (url: string, options: RequestInit = {}) => {
    return fetch(url, {
        ...options,
        headers: {
            "ngrok-skip-browser-warning": "true",
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
    });
};
