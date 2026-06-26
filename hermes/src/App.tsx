import { useState, useEffect, useMemo } from "react";
import { invoke } from "./api";
import { LauncherConfig, LauncherFormData } from "./types";
import LauncherCard from "./components/LauncherCard";
import LauncherModal from "./components/LauncherModal";
import HerbSelector from "./components/HerbSelector";
import SlayerTracker from "./components/SlayerTracker";
// SCRAPPED FEATURE: the "Supplies" burn-rate tracker is no longer wired into the
// UI. The implementation is preserved in ./components/SupplyTracker.tsx (and the
// `get_supply_usage` Rust command) but intentionally not imported/rendered. See
// hermes/CLAUDE.md → "Scrapped: supply tracker" for context and how to revive it.

type AppTab = "launchers" | "farming" | "slayer";

const TABS: AppTab[] = ["launchers", "farming", "slayer"];
const ACTIVE_TAB_KEY = "hermes.activeTab";

function loadActiveTab(): AppTab {
  try {
    const saved = localStorage.getItem(ACTIVE_TAB_KEY);
    if (saved && (TABS as string[]).includes(saved)) return saved as AppTab;
  } catch {
    // localStorage unavailable (e.g. private mode) — fall back to default.
  }
  return "launchers";
}

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(loadActiveTab);
  const [launchers, setLaunchers] = useState<LauncherConfig[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LauncherConfig | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadLaunchers = async () => {
    try {
      const data = await invoke<LauncherConfig[]>("get_launchers");
      setLaunchers(data);
    } catch (e) {
      console.error("Failed to load launchers:", e);
      alert("Failed to load launchers: " + e);
    }
  };

  useEffect(() => {
    loadLaunchers();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
    } catch {
      // Ignore persistence failures (e.g. storage disabled).
    }
  }, [activeTab]);

  const categories = useMemo(() => {
    const cats = new Set(launchers.map((l) => l.category || "Uncategorized"));
    return ["All", ...Array.from(cats).sort((a, b) => {
      if (a === "RuneLite") return -1;
      if (b === "RuneLite") return 1;
      return a.localeCompare(b);
    })];
  }, [launchers]);

  const filtered = useMemo(() => {
    return launchers.filter((l) => {
      const matchesSearch =
        !search ||
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.executable.toLowerCase().includes(search.toLowerCase()) ||
        l.arguments.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        activeCategory === "All" ||
        (l.category || "Uncategorized") === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [launchers, search, activeCategory]);

  const grouped = useMemo(() => {
    const map: Record<string, LauncherConfig[]> = {};
    for (const l of filtered) {
      const cat = l.category || "Uncategorized";
      if (!map[cat]) map[cat] = [];
      map[cat].push(l);
    }
    return Object.entries(map).sort(([a], [b]) => {
      if (a === "RuneLite") return -1;
      if (b === "RuneLite") return 1;
      return a.localeCompare(b);
    });
  }, [filtered]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleLaunch = async (launcher: LauncherConfig) => {
    try {
      await invoke("launch_app", { config: launcher });
      showToast(`Launched ${launcher.name}`);
    } catch (e) {
      console.error("Failed to launch:", e);
      showToast(`Failed to launch: ${e}`);
    }
  };

  const handleSave = async (data: LauncherFormData) => {
    try {
      if (editing) {
        await invoke("update_launcher", {
          id: editing.id,
          data,
        });
        showToast(`Updated ${data.name}`);
      } else {
        await invoke("add_launcher", { data });
        showToast(`Added ${data.name}`);
      }
      setModalOpen(false);
      setEditing(null);
      await loadLaunchers();
    } catch (e) {
      console.error("Failed to save:", e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await invoke("delete_launcher", { id });
      showToast("Launcher removed");
      await loadLaunchers();
    } catch (e) {
      console.error("Failed to delete:", e);
    }
  };

  const handleEdit = (launcher: LauncherConfig) => {
    setEditing(launcher);
    setModalOpen(true);
  };

  const handleDuplicate = async (launcher: LauncherConfig) => {
    try {
      // Reuse add_launcher with the source's fields (sans id); the server mints
      // a fresh id. Name gets a " (copy)" suffix to keep duplicates distinct.
      const { id: _id, ...rest } = launcher;
      void _id;
      const data: LauncherFormData = { ...rest, name: `${launcher.name} (copy)` };
      await invoke("add_launcher", { data });
      showToast(`Duplicated ${launcher.name}`);
      await loadLaunchers();
    } catch (e) {
      console.error("Failed to duplicate:", e);
      showToast(`Failed to duplicate: ${e}`);
    }
  };

  const handleAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="header-title">
            <span className="logo">✦</span>
            <div className="wordmark">
              <h1>Hermes</h1>
              <span className="tagline">Launch Bureau · Est. MMXXV</span>
            </div>
          </div>
          <nav className="app-tabs">
            <button
              className={`app-tab ${activeTab === "launchers" ? "active" : ""}`}
              onClick={() => setActiveTab("launchers")}
            >
              Launchers
            </button>
            <button
              className={`app-tab ${activeTab === "farming" ? "active" : ""}`}
              onClick={() => setActiveTab("farming")}
            >
              Farming
            </button>
            <button
              className={`app-tab ${activeTab === "slayer" ? "active" : ""}`}
              onClick={() => setActiveTab("slayer")}
            >
              Slayer
            </button>
          </nav>
        </div>
        {activeTab === "launchers" && (
          <div className="header-actions">
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search launchers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={handleAdd}>
              + Add Launcher
            </button>
          </div>
        )}
      </header>

      {activeTab === "launchers" && (
        <>
          {categories.length > 2 && (
            <div className="category-tabs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`category-tab ${activeCategory === cat ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <main className="main">
            {filtered.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">⚡</span>
                <p>
                  {launchers.length === 0
                    ? "No launchers yet. Add one to get started!"
                    : "No launchers match your search."}
                </p>
                {launchers.length === 0 && (
                  <button className="btn btn-primary" onClick={handleAdd}>
                    + Add Your First Launcher
                  </button>
                )}
              </div>
            ) : activeCategory === "All" ? (
              grouped.map(([category, items]) => (
                <div key={category} className="category-section">
                  <div className="category-header">{category}</div>
                  <div className="launcher-grid">
                    {items.map((launcher) => (
                      <LauncherCard
                        key={launcher.id}
                        launcher={launcher}
                        onLaunch={handleLaunch}
                        onEdit={handleEdit}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="launcher-grid">
                {filtered.map((launcher) => (
                  <LauncherCard
                    key={launcher.id}
                    launcher={launcher}
                    onLaunch={handleLaunch}
                    onEdit={handleEdit}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </main>
        </>
      )}

      {activeTab === "farming" && (
        <main className="main">
          <HerbSelector onToast={showToast} />
        </main>
      )}

      {activeTab === "slayer" && (
        <main className="main">
          <SlayerTracker />
        </main>
      )}

      {modalOpen && (
        <LauncherModal
          initial={editing}
          onSave={handleSave}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;
