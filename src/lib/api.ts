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

// Wrapper global de fetch com header ngrok e Auth token para todas as requisições
export const apiFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("app_token");
    
    const response = await fetch(url, {
        ...options,
        headers: {
            "ngrok-skip-browser-warning": "true",
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });

    if (response.status === 401) {
        localStorage.removeItem("app_token");
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }

    return response;
};
