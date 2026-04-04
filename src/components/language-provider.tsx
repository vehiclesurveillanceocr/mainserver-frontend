"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  LANGUAGE_META,
  LANGUAGE_STORAGE_KEY,
  translations,
  type Language,
  type TranslationDictionary,
} from "@/lib/i18n";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  locale: string;
  isRTL: boolean;
  dictionary: TranslationDictionary;
  formatDate: (value: string, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: string, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: string, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: (value: string | null) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "en" || stored === "ar") {
      setLanguage(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    const meta = LANGUAGE_META[language];
    document.documentElement.lang = language;
    document.documentElement.dir = meta.dir;
    document.body.dir = meta.dir;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => {
    const dictionary = translations[language];
    const locale = LANGUAGE_META[language].locale;
    const isRTL = LANGUAGE_META[language].dir === "rtl";

    return {
      language,
      setLanguage,
      locale,
      isRTL,
      dictionary,
      formatDate(value, options) {
        return new Intl.DateTimeFormat(locale, options ?? {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date(value));
      },
      formatTime(value, options) {
        return new Intl.DateTimeFormat(locale, options ?? {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date(value));
      },
      formatDateTime(value, options) {
        return new Intl.DateTimeFormat(locale, options ?? {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(value));
      },
      formatRelativeTime(value) {
        if (!value) return dictionary.common.never;
        const diff = Date.now() - new Date(value).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return dictionary.common.justNow;
        if (minutes < 60) return `${minutes}${dictionary.common.agoMinute}`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}${dictionary.common.agoHour}`;
        return `${Math.floor(hours / 24)}${dictionary.common.agoDay}`;
      },
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
