import { useState, useEffect, useCallback } from "react";
import { invoke } from "../api";

interface SinceTask {
  taskName: string;
  taskMaster: string;
  taskQuantity: number;
  taskCompletionTime: number;
}

interface LastRevenant {
  completionTime: number;
  quantity: number | null;
  streak: number | null;
  stored: boolean;
}

interface RevStats {
  count: number;
  average: number | null;
  shortest: number | null;
  longest: number | null;
  recent: { tasks: number; date: number }[];
}

interface SlayerStatus {
  account: string;
  totalTasks: number;
  currentStreak: number;
  lastTaskTime: number | null;
  lastRevenant: LastRevenant | null;
  markerTime: number | null;
  tasksSinceRevenant: number;
  tasksSince: SinceTask[];
  revStats: RevStats;
}

interface DrynessEntry {
  label: string;
  oneIn: number;
  got: number;
  expected: number;
  wouldHaveByNow: number; // fraction of on-task skulled players who'd have it by now
  stillDry: number;
}

interface RareHit {
  name: string;
  killNumber: number;
  date: string | null;
}

interface RevenantLuck {
  account: string;
  killCount: number;
  totalValue: number;
  gpPerKill: number;
  firstKill: string | null;
  lastKill: string | null;
  braceletCount: number;
  rareHits: RareHit[];
  dryness: DrynessEntry[];
}

/** "3 days ago" / "5 hours ago" / "just now" from an epoch-ms timestamp. */
function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString();
}

/** Compact gp: 39,356,506 → "39.4M", 55,354 → "55.4k". */
function gp(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(n);
}

/** Plain-English luck verdict from "fraction of players who'd have it by now". */
function luckVerdict(wouldHaveByNow: number): string {
  if (wouldHaveByNow < 0.5) return "ahead of rate";
  if (wouldHaveByNow < 0.75) return "slightly dry";
  if (wouldHaveByNow < 0.9) return "unlucky";
  return "very dry";
}

/** Color tone for a luck verdict: ahead = good, mild = neutral, dry = bad. */
function verdictTone(wouldHaveByNow: number): "good" | "ok" | "bad" {
  if (wouldHaveByNow < 0.5) return "good";
  if (wouldHaveByNow < 0.75) return "ok";
  return "bad";
}

function SlayerTracker() {
  const [status, setStatus] = useState<SlayerStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [luck, setLuck] = useState<RevenantLuck | null>(null);

  const load = useCallback(() => {
    invoke<SlayerStatus>("get_slayer_status")
      .then(setStatus)
      .catch((e) => setError(String(e)))
      .finally(() => setLoaded(true));
    // Optional: the revenant loot log may not exist. Fail quietly.
    invoke<RevenantLuck>("get_revenant_luck")
      .then(setLuck)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // Re-read the logs whenever you tab back to Hermes (e.g. after a kill in-game).
    const onFocus = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [load]);

  const markRevTask = async () => {
    await invoke("record_rev_task").catch(() => {});
    load();
  };
  const clearRevMarker = async () => {
    await invoke("undo_rev_task").catch(() => {});
    load();
  };

  if (!loaded) {
    return <div className="slayer-tab slayer-loading">Loading slayer history…</div>;
  }

  if (error || !status) {
    return (
      <div className="slayer-tab slayer-empty">
        <span className="empty-icon">⚔️</span>
        <p>Couldn't read Slayer History data.</p>
        {error && <p className="slayer-error-detail">{error}</p>}
      </div>
    );
  }

  const rev = status.lastRevenant;
  const stored = rev?.stored ?? false;

  return (
    <div className="slayer-tab">
      <div className="slayer-hero">
        <div className="slayer-hero-main">
          <div className="slayer-hero-label">Tasks since last Revenants</div>
          <div className="slayer-hero-count">{status.tasksSinceRevenant}</div>
        </div>
        <div className="slayer-hero-side">
          {rev ? (
            <div className="slayer-hero-meta" title={formatDate(rev.completionTime)}>
              {stored
                ? `In storage · ${timeAgo(rev.completionTime)}`
                : `Last rev (${rev.quantity} kills) · ${timeAgo(rev.completionTime)}`}
            </div>
          ) : (
            <div className="slayer-hero-meta">
              No rev on record — counting all {status.totalTasks} tasks
            </div>
          )}
          <div className="slayer-hero-actions">
            <button className="btn btn-primary slayer-mark-btn" onClick={markRevTask}>
              {stored ? "Got another rev" : "Got a rev task"}
            </button>
            {status.markerTime !== null && (
              <button className="slayer-clear-btn" onClick={clearRevMarker}>
                Undo
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="slayer-chips">
        <span className="slayer-chip">
          <b>{status.currentStreak}</b> streak
        </span>
        <span className="slayer-chip">
          <b>{status.totalTasks}</b> tasks done
        </span>
        {status.lastTaskTime && (
          <span className="slayer-chip">
            last <b>{timeAgo(status.lastTaskTime)}</b>
          </span>
        )}
      </div>

      <div className="slayer-panel">
        <div className="slayer-list-header">
          Rev task stats
          <span className="luck-assumption">
            {status.revStats.count} rev{status.revStats.count === 1 ? "" : "s"} recorded
          </span>
        </div>
        {status.revStats.count > 0 ? (
          <>
            <div className="slayer-chips">
              <span className="slayer-chip">
                <b>{status.revStats.average!.toFixed(1)}</b> avg
              </span>
              <span className="slayer-chip">
                <b>{status.revStats.shortest}</b> shortest
              </span>
              <span className="slayer-chip">
                <b>{status.revStats.longest}</b> longest
              </span>
            </div>
            <div className="slayer-gaps">
              {status.revStats.recent.map((g, i) => (
                <div key={`${g.date}-${i}`} className="slayer-gap">
                  <span className="slayer-gap-no">#{status.revStats.count - i}</span>
                  <span className="slayer-gap-tasks">
                    <b>{g.tasks}</b> tasks
                  </span>
                  <span className="slayer-gap-date">{formatDate(g.date)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="slayer-empty-note">
            No revs recorded yet — your first lands when you hit "Got a rev task".
          </div>
        )}
      </div>

      {luck && luck.killCount > 0 && (
        <div className="slayer-panel">
          <div className="slayer-list-header">
            Revenant dragon luck
            <span className="luck-assumption">
              {luck.killCount.toLocaleString()} KC · {gp(luck.totalValue)} · {gp(luck.gpPerKill)}/kill
            </span>
          </div>

          <div className="luck-rows">
            {luck.dryness.map((d) => {
              const tone = verdictTone(d.wouldHaveByNow);
              return (
                <div key={d.label} className={`luck-row tone-${tone}`}>
                  <div className="luck-row-top">
                    <span className="luck-label">{d.label}</span>
                    <span className={`luck-verdict tone-${tone}`}>
                      {luckVerdict(d.wouldHaveByNow)}
                    </span>
                  </div>
                  <div className="luck-bar">
                    <div
                      className="luck-bar-fill"
                      style={{ width: `${Math.min(100, d.wouldHaveByNow * 100)}%` }}
                    />
                  </div>
                  <div className="luck-row-meta">
                    <span>{Math.round(d.wouldHaveByNow * 100)}% would have it by now</span>
                    <span>
                      {d.got} got · {d.expected.toFixed(2)} exp · 1/{d.oneIn.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {(luck.rareHits.length > 0 || luck.braceletCount > 0) && (
            <div className="luck-drops">
              <div className="luck-drops-header">
                Uniques
                {luck.braceletCount > 0 && (
                  <span className="luck-bracelets">
                    +{luck.braceletCount} bracelets of ethereum
                  </span>
                )}
              </div>
              {luck.rareHits.map((h, i) => (
                <div key={`${h.killNumber}-${h.name}-${i}`} className="luck-hit">
                  <span className="luck-hit-name">{h.name}</span>
                  <span className="luck-hit-kc">kill #{h.killNumber.toLocaleString()}</span>
                  <span className="luck-hit-date">{h.date ?? ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {status.tasksSince.length > 0 && (
        <details className="slayer-list">
          <summary className="slayer-list-header">
            Since last Revenants
            <span className="luck-assumption">{status.tasksSince.length} tasks</span>
          </summary>
          {status.tasksSince.map((t, i) => (
            <div key={`${t.taskCompletionTime}-${i}`} className="slayer-row">
              <span className="slayer-row-name">{t.taskName}</span>
              <span className="slayer-row-master">{t.taskMaster}</span>
              <span className="slayer-row-qty">{t.taskQuantity}</span>
              <span className="slayer-row-time">{timeAgo(t.taskCompletionTime)}</span>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

export default SlayerTracker;
