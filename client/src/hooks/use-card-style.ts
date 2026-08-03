import { useState, useEffect, useCallback } from "react";

export type CardStyle = "classic" | "red";

const STORAGE_KEY = "elite_card_style";

function getStoredStyle(): CardStyle {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "classic" || v === "red") return v;
  } catch {}
  return "classic"; // default to classic
}

export function useCardStyle() {
  const [cardStyle, setCardStyleState] = useState<CardStyle>(getStoredStyle);

  // Keep in sync if another tab / component changes it
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const v = e.newValue;
        if (v === "classic" || v === "red") setCardStyleState(v);
      }
    };
    const onCustom = () => setCardStyleState(getStoredStyle());
    window.addEventListener("storage", onStorage);
    window.addEventListener("cardStyleChanged", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cardStyleChanged", onCustom);
    };
  }, []);

  const setCardStyle = useCallback((style: CardStyle) => {
    try { localStorage.setItem(STORAGE_KEY, style); } catch {}
    setCardStyleState(style);
    window.dispatchEvent(new Event("cardStyleChanged"));
  }, []);

  return { cardStyle, setCardStyle };
}
