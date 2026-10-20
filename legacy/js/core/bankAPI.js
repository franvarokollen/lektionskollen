// ============================================================
// Data APIs — Bank (shared lesson pool) and Schools (registry).
// Reads are synchronous from local cache. Writes go to Supabase.
// Depends on: storage.js, constants.js
// ============================================================

// ---- Supabase REST helpers ----
function _sbUrl(table, params = "") {
  return `${window.SUPABASE_URL}/rest/v1/${table}${params ? `?${params}` : ""}`;
}
function _sbHeaders(extra = {}) {
  return {
    "Content-Type": "application/json",
    "apikey": window.SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`,
    "Prefer": "return=representation",
    ...extra,
  };
}
async function _sbGet(table, query = "") {
  const r = await fetch(_sbUrl(table, query), { headers: _sbHeaders() });
  if (!r.ok) throw new Error(`Supabase GET ${table} failed: ${r.status}`);
  return r.json();
}
async function _sbPost(table, body) {
  const r = await fetch(_sbUrl(table), {
    method: "POST", headers: _sbHeaders(), body: JSON.stringify(body),
  });
  if (!r.ok) { const e = await r.text(); throw new Error(`Supabase POST ${table} failed: ${r.status} ${e}`); }
  return r.json();
}
async function _sbPatch(table, query, body) {
  const r = await fetch(_sbUrl(table, query), {
    method: "PATCH", headers: _sbHeaders(), body: JSON.stringify(body),
  });
  if (!r.ok) { const e = await r.text(); throw new Error(`Supabase PATCH ${table} failed: ${r.status} ${e}`); }
  return r.json();
}
async function _sbDelete(table, query) {
  const r = await fetch(_sbUrl(table, query), {
    method: "DELETE", headers: _sbHeaders({ "Prefer": "return=minimal" }),
  });
  if (!r.ok) { const e = await r.text(); throw new Error(`Supabase DELETE ${table} failed: ${r.status} ${e}`); }
  return true;
}

// ---- bankAPI ----
window.bankAPI = {
  // ---- Read (synchronous, from cache) ----
  all() { return window.loadBankCache().lessons; },
  active() { return this.all().filter(l => l.status === "active"); },
  byId(id) { return this.all().find(l => l.lesson_id === id) || null; },

  // Separate pools: teacher (is_sub=false) and sub (is_sub=true)
  getActivePool({ stage, grade, subject, isSub = false }) {
    return this.active().filter(l =>
      l.stage === stage &&
      String(l.grade) === String(grade) &&
      l.subject === subject &&
      !!l.is_sub === isSub
    );
  },

  // Fuzzy match via similarityRatio
  findSimilar({ stage, grade, subject, topic, isSub = false, threshold = 0.45 }) {
    const pool = this.getActivePool({ stage, grade, subject, isSub });
    return pool
      .map(l => ({ lesson: l, score: window.similarityRatio(topic, l.topic || "") }))
      .filter(x => x.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .map(x => x.lesson);
  },

  findBestMatch({ stage, grade, subject, topic, isSub = false }) {
    const results = this.findSimilar({ stage, grade, subject, topic, isSub, threshold: 0.55 });
    return results.sort((a, b) => (b._avgRating ?? -1) - (a._avgRating ?? -1))[0] || null;
  },

  matrixForStage(stage) {
    const lessons = this.active().filter(l => l.stage === stage);
    const map = new Map();
    for (const l of lessons) {
      const k = `${l.grade}|${l.subject}|${l.is_sub ? "sub" : "teacher"}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(l);
    }
    return map;
  },

  cacheUpsert(lesson) {
    const cache = window.loadBankCache();
    const idx = cache.lessons.findIndex(l => l.lesson_id === lesson.lesson_id);
    if (idx >= 0) cache.lessons[idx] = lesson;
    else cache.lessons.push(lesson);
    window.saveBankCache(cache);
  },

  cacheMarkArchived(id) {
    const cache = window.loadBankCache();
    const rec = cache.lessons.find(l => l.lesson_id === id);
    if (rec) { rec.status = "archived"; rec.archived_at = new Date().toISOString(); }
    window.saveBankCache(cache);
  },

  // ---- Remote ----
  async refresh() {
    const rows = await _sbGet("lessons", "status=eq.active&order=created_at.desc");
    const lessons = rows.map(r => ({ ...r, lesson: r.lesson_json }));
    window.saveBankCache({ lessons, fetchedAt: Date.now() });
    await window.qualityAPI.fetchRatings();
    return lessons;
  },

  async addLesson(_url, { schoolId, stage, grade, subject, topic, title, duration, lesson, provider, model }) {
    const isSub = !!(lesson && lesson.isSub);
    const poolRows = await _sbGet("lessons",
      `stage=eq.${encodeURIComponent(stage)}&grade=eq.${encodeURIComponent(grade)}&subject=eq.${encodeURIComponent(subject)}&status=eq.active&is_sub=eq.${isSub}&select=lesson_id`
    );
    if (poolRows.length >= window.ACTIVE_POOL_LIMIT) {
      const err = new Error("pool_full");
      err.code = "pool_full";
      err.activeCount = poolRows.length;
      throw err;
    }
    const [created] = await _sbPost("lessons", {
      created_by_school: schoolId || null,
      stage, grade: String(grade), subject,
      topic: topic || null, title: title || topic || null,
      duration: duration ? Number(duration) : null,
      is_sub: isSub, provider: provider || null, model: model || null,
      lesson_json: lesson, translations_json: lesson?.translations || {},
    });
    const lessonRec = {
      lesson_id: created.lesson_id, created_at: created.created_at,
      created_by_school: schoolId, status: "active",
      stage, grade: String(grade), subject, topic, title, duration,
      is_sub: isSub, lesson, archived_at: "",
    };
    this.cacheUpsert(lessonRec);
    return lessonRec;
  },

  async archive(_url, lessonId, schoolId) {
    await _sbPatch("lessons", `lesson_id=eq.${lessonId}`, {
      status: "archived", archived_at: new Date().toISOString(),
    });
    try {
      await _sbPost("usage_log", { lesson_id: lessonId, school_id: schoolId || null });
    } catch (e) { console.warn("Usage log failed", e); }
    this.cacheMarkArchived(lessonId);
  },
};

// ---- schoolsAPI ----
window.schoolsAPI = {
  all() { return window.loadSchoolsCache(); },

  async refresh() {
    const rows = await _sbGet("schools", "order=created_at.desc");
    window.saveSchoolsCache(rows);
    return rows;
  },

  async create(_url, name) {
    const [created] = await _sbPost("schools", { name });
    const list = window.loadSchoolsCache();
    if (!list.some(s => s.school_id === created.school_id)) {
      list.push(created);
      window.saveSchoolsCache(list);
    }
    return { ok: true, schoolId: created.school_id, name: created.name };
  },

  // ── NEW: rename a school ──────────────────────────────────────────────────
  async rename(schoolId, newName) {
    await _sbPatch("schools", `school_id=eq.${encodeURIComponent(schoolId)}`, { name: newName });
    // Update local cache immediately so the UI reflects the change without a full refresh
    const list = window.loadSchoolsCache();
    const rec = list.find(s => s.school_id === schoolId);
    if (rec) { rec.name = newName; window.saveSchoolsCache(list); }
    return { ok: true };
  },

  // ── NEW: delete a school ──────────────────────────────────────────────────
  // Note: this only removes the school registry entry. Lessons created by
  // that school remain in the bank (they are shared and may be in use by others).
  async remove(schoolId) {
    await _sbDelete("schools", `school_id=eq.${encodeURIComponent(schoolId)}`);
    const list = window.loadSchoolsCache().filter(s => s.school_id !== schoolId);
    window.saveSchoolsCache(list);
    return { ok: true };
  },
};

// ---- extrasAPI ----
window.extrasAPI = {
  async get({ lessonId, kind, language }) {
    try {
      const rows = await _sbGet("extras",
        `lesson_id=eq.${lessonId}&kind=eq.${encodeURIComponent(kind)}&language=eq.${language}&limit=1`
      );
      return rows.length > 0 ? rows[0].content_json : null;
    } catch { return null; }
  },
  async save({ lessonId, kind, language, content, provider, model }) {
    try {
      await _sbPost("extras", {
        lesson_id: lessonId, kind, language: language || "sv",
        content_json: content, provider: provider || null, model: model || null,
      });
    } catch (e) { console.warn("extrasAPI.save failed", e); }
  },
};

// ---- qualityAPI — global 1-10 ratings ----
window.qualityAPI = {
  async rate({ lessonId, schoolId, rating, notes }) {
    const clamped = Math.min(10, Math.max(1, Math.round(rating)));
    await _sbPost("quality_ratings", {
      lesson_id: lessonId, school_id: schoolId || null,
      rating: clamped, notes: notes || null,
    });
    const cache = window.loadBankCache();
    const rec = cache.lessons.find(l => l.lesson_id === lessonId);
    if (rec) {
      rec._ratings = [...(rec._ratings || []), clamped];
      rec._avgRating = rec._ratings.reduce((a, b) => a + b, 0) / rec._ratings.length;
      rec._ratingCount = rec._ratings.length;
      window.saveBankCache(cache);
    }
  },

  async fetchRatings() {
    try {
      const ratings = await _sbGet("quality_ratings", "select=lesson_id,rating");
      const map = {};
      for (const r of ratings) {
        if (!map[r.lesson_id]) map[r.lesson_id] = [];
        map[r.lesson_id].push(r.rating);
      }
      const cache = window.loadBankCache();
      for (const l of cache.lessons) {
        const rs = map[l.lesson_id] || [];
        l._ratings = rs;
        l._avgRating = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null;
        l._ratingCount = rs.length;
      }
      window.saveBankCache(cache);
      return map;
    } catch (e) {
      console.warn("fetchRatings failed", e);
      return {};
    }
  },

  topRated({ isSub = false } = {}) {
    return window.bankAPI.active()
      .filter(l => !!l.is_sub === isSub)
      .slice()
      .sort((a, b) => (b._avgRating ?? -1) - (a._avgRating ?? -1));
  },
};
