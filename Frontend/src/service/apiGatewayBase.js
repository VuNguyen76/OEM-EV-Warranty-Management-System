import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const normalizeBaseUrl = (url) => {
  if (!url) return "";
  return url.endsWith("/") ? url : `${url}/`;
};

const baseUrlFromEnv =
  import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:3000/api";
const API_GATEWAY_BASE_URL = normalizeBaseUrl(baseUrlFromEnv);

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_GATEWAY_BASE_URL,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = getState().user?.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const apiGatewayBaseQuery = async (args, api, extraOptions) => {
  const normalizedArgs =
    typeof args === "string" ? { url: args } : { ...(args || {}) };

  if (normalizedArgs.body instanceof FormData) {
    const token = api.getState().user?.token;
    const headers = new Headers(normalizedArgs.headers || {});
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const targetUrl = normalizedArgs.url?.startsWith("http")
      ? normalizedArgs.url
      : `${API_GATEWAY_BASE_URL}${
          normalizedArgs.url?.replace(/^\//, "") ?? ""
        }`;

    const response = await fetch(targetUrl, {
      method: normalizedArgs.method || "GET",
      headers,
      body: normalizedArgs.body,
      credentials: "include",
    });

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      return {
        error: {
          status: response.status,
          data,
        },
      };
    }

    return { data };
  }

  return rawBaseQuery(args, api, extraOptions);
};


