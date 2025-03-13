export const API_URLS = {
    development: "http://localhost:8080",
    production: "https://patch-roulette.papermc.io",
    developmentProductionProxy: "/prod-api-proxy",
};

export const getApiUrl = () => {
    const env = import.meta.env["VITE_API_MODE"] || "prod";
    if (env == "dev") {
        return API_URLS.development;
    } else if (env == "prod") {
        return API_URLS.production;
    } else if (env == "dev-prod") {
        return API_URLS.developmentProductionProxy;
    }
    throw Error("Unknown environment.");
};
