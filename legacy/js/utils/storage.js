// ============================================================
// Storage layer — localStorage helpers + React hooks for change notifications.
// Three independent caches:
//   1. Bank cache (BANK_CACHE_KEY)    — mirrors the remote "Bank" sheet.
//   2. Schools cache (SCHOOLS_CACHE)  — mirrors the remote "Schools" sheet.
//   3. Library (LIBRARY_KEY)          — per-school usage log + sub feedback.
// Each one dispatches a window event when written so React can rerender.
// Depends on: constants.js (BANK_CACHE_KEY, SCHOOLS_CACHE_KEY, LIBRARY_KEY)
// ============================================================
const { useState: useState_storage, useEffect: useEffect_storage } = React;

// ---- Bank cache ----
window.loadBankCache = function loadBankCache() {
  try {
    const raw = localStorage.getItem(window.BANK_CACHE_KEY);
    if (!raw) return { lessons: [], fetchedAt: 0 };
    const parsed = JSON.parse(raw);
    return parsed?.lessons ? parsed : { lessons: [], fetchedAt: 0 };
  } catch {
    return { lessons: [], fetchedAt: 0 };
  }
};

window.saveBankCache = function saveBankCache(data) {
  try {
    localStorage.setItem(window.BANK_CACHE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event("lp-bank-change"));
  } catch (e) {
    console.error("Bank cache save failed", e);
  }
};

// React hook: rerender when bank cache changes (same tab or cross-tab).
window.useBankVersion = function useBankVersion() {
  const [tick, setTick] = useState_storage(0);
  useEffect_storage(() => {
    const onChange = () => setTick(t => t + 1);
    window.addEventListener("lp-bank-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("lp-bank-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return tick;
};

// ---- Schools cache ----
window.loadSchoolsCache = function loadSchoolsCache() {
  try {
    const raw = localStorage.getItem(window.SCHOOLS_CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch { return []; }
};

window.saveSchoolsCache = function saveSchoolsCache(list) {
  try {
    localStorage.setItem(window.SCHOOLS_CACHE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("lp-schools-change"));
  } catch (e) {
    console.error("Schools cache save failed", e);
  }
};

window.useSchoolsVersion = function useSchoolsVersion() {
  const [tick, setTick] = useState_storage(0);
  useEffect_storage(() => {
    const onChange = () => setTick(t => t + 1);
    window.addEventListener("lp-schools-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("lp-schools-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return tick;
};

// ---- lessonLibrary: per-school usage log + feedback ----
// Keyed by remote lesson_id. Lesson content itself lives in the bank cache;
// this store only tracks "did THIS school use it" and "what did the sub say".
window.lessonLibrary = {
  _load() {
    try {
      const raw = localStorage.getItem(window.LIBRARY_KEY);
      if (!raw) return { schema: 3, usage: [], feedback: [] };
      const parsed = JSON.parse(raw);
      if (parsed?.schema === 3) return parsed;
      // Migration: older schemas keyed usage to local-only lesson ids that
      // no longer link to the new bank lesson_ids. Back them up, start fresh.
      try { localStorage.setItem(window.LIBRARY_KEY + "-backup", raw); } catch {}
      return { schema: 3, usage: [], feedback: [] };
    } catch {
      return { schema: 3, usage: [], feedback: [] };
    }
  },
  _save(data) {
    try {
      localStorage.setItem(window.LIBRARY_KEY, JSON.stringify(data));
      window.dispatchEvent(new Event("lp-library-change"));
    } catch (e) { console.error("Library save failed", e); }
  },
  addUsage({ lessonId, used }) {
    const data = this._load();
    data.usage.push({ lessonId, ...used, loggedAt: Date.now() });
    this._save(data);
  },
  addFeedback({ lessonId, feedback }) {
    const data = this._load();
    data.feedback.push({ lessonId, ...feedback, at: Date.now() });
    this._save(data);
  },
  getUsageForLesson(lessonId) {
    return this._load().usage.filter(u => u.lessonId === lessonId);
  },
  getFeedbackForLesson(lessonId) {
    return this._load().feedback.filter(f => f.lessonId === lessonId);
  },
  // For BankView "have I used this?" indicator on each tile.
  hasUsed(lessonId) {
    return this._load().usage.some(u => u.lessonId === lessonId);
  },
  allUsage() { return this._load().usage; },
  allFeedback() { return this._load().feedback; },
  exportAll() { return this._load(); },
  importAll(payload) {
    if (!payload || typeof payload !== "object") return false;
    if (payload.schema === 3) {
      this._save({ schema: 3, usage: payload.usage || [], feedback: payload.feedback || [] });
      return true;
    }
    return false;
  },
};

window.useLibraryVersion = function useLibraryVersion() {
  const [tick, setTick] = useState_storage(0);
  useEffect_storage(() => {
    const onChange = () => setTick(t => t + 1);
    window.addEventListener("lp-library-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("lp-library-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return tick;
};
