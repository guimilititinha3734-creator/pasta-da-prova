"use client";

// Liga o service worker (necessário para "instalar" o app no celular)
import { useEffect } from "react";

export function RegistrarPWA() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
