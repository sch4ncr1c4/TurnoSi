import type { Response } from "express";

import { env } from "../config/env.js";

const authCookieName = "access_token";
const refreshCookieName = "refresh_token";

export function parseCookies(cookieHeader?: string) {
  if (!cookieHeader) {
    return {};
  }

  return Object.fromEntries(
    cookieHeader.split(";").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, decodeURIComponent(rest.join("="))];
    })
  );
}

function appendCookie(response: Response, cookie: string) {
  const current = response.getHeader("Set-Cookie");
  const cookies = Array.isArray(current) ? current : current ? [String(current)] : [];
  response.setHeader("Set-Cookie", [...cookies, cookie]);
}

export function setAuthCookie(response: Response, token: string, persist = true) {
  const isProduction = env.NODE_ENV === "production";
  const cookie = [
    `${authCookieName}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax"
  ];

  if (persist) {
    cookie.push(`Max-Age=${env.AUTH_ACCESS_TTL_SECONDS}`);
  }

  if (isProduction) {
    cookie.push("Secure");
  }

  appendCookie(response, cookie.join("; "));
}

export function setRefreshCookie(response: Response, token: string, persist = true) {
  const cookie = [
    `${refreshCookieName}=${encodeURIComponent(token)}`,
    "Path=/api/v1/auth",
    "HttpOnly",
    "SameSite=Strict"
  ];
  if (persist) {
    cookie.push(`Max-Age=${env.AUTH_REFRESH_TTL_SECONDS}`);
  }
  if (env.NODE_ENV === "production") cookie.push("Secure");
  appendCookie(response, cookie.join("; "));
}

export function clearAuthCookies(response: Response) {
  const secure = env.NODE_ENV === "production" ? "; Secure" : "";
  appendCookie(response, `${authCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
  appendCookie(response, `${refreshCookieName}=; Path=/api/v1/auth; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
}

export function getRefreshCookieName() {
  return refreshCookieName;
}

export function getAuthCookieName() {
  return authCookieName;
}
