// ============================================================
// App constants — version, storage keys, defaults, curriculum data.
// ============================================================

window.APP_VERSION = "1.8.0";

window.STORAGE_KEY = "lektionsplaneraren-v1";
window.LIBRARY_KEY = "lektionsplaneraren-library-v1";
window.BANK_CACHE_KEY = "lektionsplaneraren-bank-cache-v1";
window.SCHOOLS_CACHE_KEY = "lektionsplaneraren-schools-cache-v1";

// Max active lessons per (stage|grade|subject) slot — separate for teacher and sub.
window.ACTIVE_POOL_LIMIT = 3;

// ============================================================
// Supabase — dedicated Lektionsplaneraren project
// ============================================================
window.SUPABASE_URL = "https://frfebixakocexxyservf.supabase.co";
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZmViaXhha29jZXh4eXNlcnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjUyMDgsImV4cCI6MjA5NDI0MTIwOH0.DLerdFjEVMWxvnZhwQYbl9UVFvLNOvkkWAW65YWeyUY";

// ============================================================
// LGR22 / Gy22 curriculum
// ============================================================
window.STAGES = {
  "Lågstadiet": ["Årskurs 1", "Årskurs 2", "Årskurs 3"],
  "Mellanstadiet": ["Årskurs 4", "Årskurs 5", "Årskurs 6"],
  "Högstadiet": ["Årskurs 7", "Årskurs 8", "Årskurs 9"],
  "Gymnasiet": ["Gymnasiet år 1", "Gymnasiet år 2", "Gymnasiet år 3"],
};

window.SUBJECTS_BY_STAGE = {
  "Lågstadiet": ["Svenska", "Svenska som andraspråk", "Matematik", "Engelska", "NO (Naturorienterande ämnen)", "SO (Samhällsorienterande ämnen)", "Bild", "Musik", "Idrott och hälsa", "Slöjd", "Teknik"],
  "Mellanstadiet": ["Svenska", "Svenska som andraspråk", "Matematik", "Engelska", "Biologi", "Fysik", "Kemi", "Geografi", "Historia", "Religionskunskap", "Samhällskunskap", "Bild", "Musik", "Idrott och hälsa", "Slöjd", "Teknik", "Hem- och konsumentkunskap", "Moderna språk"],
  "Högstadiet": ["Svenska", "Svenska som andraspråk", "Matematik", "Engelska", "Moderna språk", "Biologi", "Fysik", "Kemi", "Geografi", "Historia", "Religionskunskap", "Samhällskunskap", "Bild", "Musik", "Idrott och hälsa", "Slöjd", "Teknik", "Hem- och konsumentkunskap"],
  "Gymnasiet": ["Svenska 1", "Svenska 2", "Svenska 3", "Engelska 5", "Engelska 6", "Engelska 7", "Matematik 1a", "Matematik 1b", "Matematik 1c", "Matematik 2a", "Matematik 2b", "Matematik 2c", "Matematik 3b", "Matematik 3c", "Matematik 4", "Matematik 5", "Biologi 1", "Biologi 2", "Fysik 1", "Fysik 2", "Kemi 1", "Kemi 2", "Historia 1a1", "Historia 1b", "Historia 2a", "Religionskunskap 1", "Samhällskunskap 1a1", "Samhällskunskap 1b", "Naturkunskap 1a1", "Naturkunskap 1b", "Idrott och hälsa 1", "Filosofi 1", "Psykologi 1"],
};

window.EN_LABELS = {
  "Lågstadiet": "Lower primary (Y1-3)", "Mellanstadiet": "Middle primary (Y4-6)",
  "Högstadiet": "Lower secondary (Y7-9)", "Gymnasiet": "Upper secondary",
  "Årskurs 1": "Year 1", "Årskurs 2": "Year 2", "Årskurs 3": "Year 3",
  "Årskurs 4": "Year 4", "Årskurs 5": "Year 5", "Årskurs 6": "Year 6",
  "Årskurs 7": "Year 7", "Årskurs 8": "Year 8", "Årskurs 9": "Year 9",
  "Gymnasiet år 1": "Upper sec. Year 1", "Gymnasiet år 2": "Upper sec. Year 2", "Gymnasiet år 3": "Upper sec. Year 3",
  "Svenska": "Swedish", "Svenska som andraspråk": "Swedish as a second language",
  "Matematik": "Mathematics", "Engelska": "English",
  "NO (Naturorienterande ämnen)": "Science (combined)", "SO (Samhällsorienterande ämnen)": "Social studies (combined)",
  "Biologi": "Biology", "Fysik": "Physics", "Kemi": "Chemistry",
  "Geografi": "Geography", "Historia": "History",
  "Religionskunskap": "Religious studies", "Samhällskunskap": "Civics",
  "Bild": "Art", "Musik": "Music", "Idrott och hälsa": "PE and health",
  "Slöjd": "Crafts (Slöjd)", "Teknik": "Technology",
  "Hem- och konsumentkunskap": "Home economics", "Moderna språk": "Modern languages",
  "Svenska 1": "Swedish 1", "Svenska 2": "Swedish 2", "Svenska 3": "Swedish 3",
  "Engelska 5": "English 5", "Engelska 6": "English 6", "Engelska 7": "English 7",
  "Matematik 1a": "Mathematics 1a", "Matematik 1b": "Mathematics 1b", "Matematik 1c": "Mathematics 1c",
  "Matematik 2a": "Mathematics 2a", "Matematik 2b": "Mathematics 2b", "Matematik 2c": "Mathematics 2c",
  "Matematik 3b": "Mathematics 3b", "Matematik 3c": "Mathematics 3c",
  "Matematik 4": "Mathematics 4", "Matematik 5": "Mathematics 5",
  "Biologi 1": "Biology 1", "Biologi 2": "Biology 2",
  "Fysik 1": "Physics 1", "Fysik 2": "Physics 2",
  "Kemi 1": "Chemistry 1", "Kemi 2": "Chemistry 2",
  "Historia 1a1": "History 1a1", "Historia 1b": "History 1b", "Historia 2a": "History 2a",
  "Religionskunskap 1": "Religious studies 1",
  "Samhällskunskap 1a1": "Civics 1a1", "Samhällskunskap 1b": "Civics 1b",
  "Naturkunskap 1a1": "Natural science 1a1", "Naturkunskap 1b": "Natural science 1b",
  "Idrott och hälsa 1": "PE and health 1", "Filosofi 1": "Philosophy 1", "Psykologi 1": "Psychology 1",
};

window.DEFAULT_CONFIG = {
  provider: "gemini",
  geminiKey: "", geminiModel: "gemini-2.5-flash",
  anthropicKey: "", anthropicModel: "claude-sonnet-4-5-20250929",
  openaiKey: "", openaiModel: "gpt-5.5",
  grokKey: "", grokModel: "grok-4",
  localUrl: "http://localhost:1234", localKey: "", localModel: "local-model",
  language: "sv",
  schoolId: "school-1",
  activeTab: "teacher", // "teacher" | "sub"
};
