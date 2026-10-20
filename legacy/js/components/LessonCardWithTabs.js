// ============================================================
// LessonCardWithTabs — tab bar that switches between the main plan
// and the 7 extras. Auto-generates an extra the first time its tab
// is clicked (if not already cached or loading).
// Change: now accepts and passes `language` prop to LessonCard.
// Depends on: Icon.js, LessonCard.js, ExtrasTabs.js
// ============================================================
const { useEffect: useEffect_tabs } = React;

window.LessonCardWithTabs = function LessonCardWithTabs({
  lesson, t, language = "sv", extrasEnabled, extrasCache, loadingExtras,
  onGenerateExtra, onForceRegenerate,
  activeTab, setActiveTab,
  onMarkUsed, onSubmitFeedback,
}) {
  const Icon = window.Icon;

  const tabs = [
    { key: "plan",            label: t.tabPlan,            icon: "book",   alwaysShow: true },
    { key: "worksheet",       label: t.tabWorksheet,       icon: "file" },
    { key: "anchorChart",     label: t.tabAnchorChart,     icon: "layers" },
    { key: "flashcards",      label: t.tabFlashcards,      icon: "book" },
    { key: "discussionCards", label: t.tabDiscussionCards, icon: "users" },
    { key: "diagram",         label: t.tabDiagram,         icon: "share" },
    { key: "badges",          label: t.tabBadges,          icon: "award" },
    { key: "imageSearch",     label: t.tabImageSearch,     icon: "image" },
  ];

  // A tab is visible if it's enabled in settings OR already has cached data.
  const visibleTabs = tabs.filter(tab => {
    if (tab.alwaysShow) return true;
    if (extrasEnabled[tab.key]) return true;
    if (extrasCache[`${lesson.id}:${tab.key}`]) return true;
    return false;
  });

  // Auto-generate the extra the first time its tab is activated.
  useEffect_tabs(() => {
    if (activeTab === "plan") return;
    const cacheKey = `${lesson.id}:${activeTab}`;
    if (extrasCache[cacheKey]) return;
    if (loadingExtras[cacheKey]) return;
    onGenerateExtra(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, lesson.id]);

  const cacheKey = `${lesson.id}:${activeTab}`;
  const data = extrasCache[cacheKey];
  const loading = !!loadingExtras[cacheKey];

  return (
    <div>
      {/* Tab bar */}
      <div className="no-print" style={{
        display: "flex", gap: 4, marginBottom: 12, paddingBottom: 8,
        borderBottom: "1px solid var(--border-subtle)",
        overflowX: "auto", flexWrap: "wrap",
      }}>
        {visibleTabs.map(tab => {
          const active = activeTab === tab.key;
          const hasData = tab.key === "plan" || !!extrasCache[`${lesson.id}:${tab.key}`];
          const isLoading = !!loadingExtras[`${lesson.id}:${tab.key}`];
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 12px", fontSize: 12, fontWeight: 600,
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#fff" : "var(--text-secondary)",
              border: "1px solid " + (active ? "var(--accent)" : "var(--border-default)"),
              borderRadius: "var(--radius-sm)", cursor: "pointer", whiteSpace: "nowrap",
            }}>
              <Icon name={tab.icon} size={12} />
              {tab.label}
              {isLoading && <Icon name="refresh" size={10} style={{ animation: "spin 0.8s linear infinite", opacity: 0.7 }} />}
              {!isLoading && hasData && tab.key !== "plan" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "#fff" : "var(--success-text)" }} />}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "plan" && <window.LessonCard lesson={lesson} t={t} language={language} onMarkUsed={onMarkUsed} onSubmitFeedback={onSubmitFeedback} />}
      {activeTab === "worksheet"       && <window.WorksheetTab       data={data} loading={loading} onGenerate={() => onForceRegenerate("worksheet")} t={t} />}
      {activeTab === "anchorChart"     && <window.AnchorChartTab     data={data} loading={loading} onGenerate={() => onForceRegenerate("anchorChart")} t={t} />}
      {activeTab === "badges"          && <window.BadgesTab          data={data} loading={loading} onGenerate={() => onForceRegenerate("badges")} t={t} />}
      {activeTab === "flashcards"      && <window.FlashcardsTab      data={data} loading={loading} onGenerate={() => onForceRegenerate("flashcards")} t={t} />}
      {activeTab === "discussionCards" && <window.DiscussionCardsTab data={data} loading={loading} onGenerate={() => onForceRegenerate("discussionCards")} t={t} />}
      {activeTab === "diagram"         && <window.DiagramTab         data={data} loading={loading} onGenerate={() => onForceRegenerate("diagram")} t={t} />}
      {activeTab === "imageSearch"     && <window.ImageSearchTab     data={data} loading={loading} onGenerate={() => onForceRegenerate("imageSearch")} t={t} />}
    </div>
  );
};
