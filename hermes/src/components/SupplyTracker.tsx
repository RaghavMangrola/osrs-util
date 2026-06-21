/**
 * SCRAPPED FEATURE — Supply burn-rate tracker.
 *
 * This component is intentionally NOT imported or rendered anywhere (the
 * "Supplies" tab was removed from App.tsx). It is kept on disk as a reference
 * implementation in case the feature is revived. It still compiles and the
 * backing `get_supply_usage` Tauri command still works.
 *
 * To revive: re-add the import + a "supplies" tab/route in App.tsx (see git
 * history around this file's introduction). See hermes/CLAUDE.md →
 * "Scrapped: supply tracker" for why it was dropped (short-window noise and
 * equip/withdraw churn made the burn-rate numbers untrustworthy).
 */
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface SupplyUsage {
  itemId: number;
  currentQty: number;
  startQty: number;
  consumed: number;
  perDay: number;
  daysToEmpty: number | null;
  iconUrl: string;
  dataPoints: number;
}

interface SupplyUsageReport {
  account: string;
  availableAccounts: string[];
  firstSnapshot: string;
  lastSnapshot: string;
  snapshotCount: number;
  items: SupplyUsage[];
}

// OSRS Wiki item id -> name map, cached locally so we only fetch it occasionally.
const NAMES_KEY = "osrs-item-names-v1";
const NAMES_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function loadItemNames(): Promise<Record<number, string>> {
  try {
    const cached = localStorage.getItem(NAMES_KEY);
    if (cached) {
      const { ts, names } = JSON.parse(cached);
      if (Date.now() - ts < NAMES_TTL_MS && names) return names;
    }
  } catch {
    /* ignore corrupt cache */
  }

  const res = await fetch("https://prices.runescape.wiki/api/v1/osrs/mapping", {
    headers: { "User-Agent": "hermes osrs-utilities - supply tracker" },
  });
  if (!res.ok) throw new Error(`mapping fetch failed: ${res.status}`);
  const data: Array<{ id: number; name: string }> = await res.json();
  const names: Record<number, string> = {};
  for (const it of data) names[it.id] = it.name;
  try {
    localStorage.setItem(NAMES_KEY, JSON.stringify({ ts: Date.now(), names }));
  } catch {
    /* localStorage may be full; names still usable this session */
  }
  return names;
}

function fmtRate(n: number): string {
  if (n >= 100) return Math.round(n).toLocaleString();
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

function fmtDays(d: number | null): string {
  if (d == null) return "—";
  if (d < 1) return "<1 day";
  if (d < 1.5) return "~1 day";
  if (d < 60) return `~${Math.round(d)} days`;
  return `~${Math.round(d / 30)} mo`;
}

function severity(d: number | null): string {
  if (d == null) return "";
  if (d < 3) return "supply-critical";
  if (d < 7) return "supply-warn";
  return "";
}

function SupplyTracker() {
  const [report, setReport] = useState<SupplyUsageReport | null>(null);
  const [names, setNames] = useState<Record<number, string>>({});
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Item names load once and are reused across account switches.
  useEffect(() => {
    loadItemNames()
      .then(setNames)
      .catch((e) => console.error("Failed to load item names:", e));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    invoke<SupplyUsageReport>("get_supply_usage", { account })
      .then((r) => {
        setReport(r);
        if (account === null) setAccount(r.account);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [account]);

  const nameFor = (id: number) => names[id] || `Item ${id}`;

  if (loading && !report) {
    return <div className="supply-tab"><p className="supply-msg">Loading supply history…</p></div>;
  }

  if (error) {
    return (
      <div className="supply-tab">
        <p className="supply-msg supply-msg-error">{error}</p>
      </div>
    );
  }

  if (!report) return null;

  const tooFewSnapshots = report.snapshotCount < 2;

  return (
    <div className="supply-tab">
      <div className="supply-header">
        <div className="supply-title">
          <h3>Supply burn rate</h3>
          <span className="supply-hint">
            Ranked by how soon you'll run out, from recorded bank changes
          </span>
        </div>
        <div className="supply-meta">
          {report.availableAccounts.length > 1 && (
            <select
              className="supply-account"
              value={report.account}
              onChange={(e) => setAccount(e.target.value)}
            >
              {report.availableAccounts.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          )}
          <span className="supply-snapshot">
            {report.snapshotCount} snapshots · {report.firstSnapshot} → {report.lastSnapshot}
          </span>
        </div>
      </div>

      {tooFewSnapshots ? (
        <p className="supply-msg">
          Only {report.snapshotCount} snapshot{report.snapshotCount === 1 ? "" : "s"} recorded so far.
          Burn rates need at least 2 — check back once the watcher has logged more bank changes.
        </p>
      ) : report.items.length === 0 ? (
        <p className="supply-msg">No supplies have been drawn down over this window yet.</p>
      ) : (
        <div className="supply-grid">
          <div className="supply-row supply-row-head">
            <span className="supply-icon-cell" />
            <span className="supply-name">Item</span>
            <span className="supply-num">Have</span>
            <span className="supply-num">Per day</span>
            <span className="supply-num supply-eta-head">Runs out</span>
          </div>
          {report.items.map((it) => (
            <div
              key={it.itemId}
              className={`supply-row ${severity(it.daysToEmpty)}`}
              title={`Used ${it.consumed.toLocaleString()} since ${report.firstSnapshot} (was ${it.startQty.toLocaleString()})`}
            >
              <span className="supply-icon-cell">
                <img
                  className="supply-icon"
                  src={it.iconUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                />
              </span>
              <span className="supply-name">{nameFor(it.itemId)}</span>
              <span className="supply-num">{it.currentQty.toLocaleString()}</span>
              <span className="supply-num">{fmtRate(it.perDay)}</span>
              <span className="supply-num supply-eta">{fmtDays(it.daysToEmpty)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SupplyTracker;
