import { useState, useEffect } from "react";
import { invoke } from "../api";

interface HerbUpdateResult {
  oldHerb: string;
  newHerb: string;
  keysUpdated: number;
}

interface HerbSeedCount {
  herb: string;
  itemId: number;
  quantity: number;
}

interface BankSeedData {
  seeds: HerbSeedCount[];
  snapshotDate: string;
}

interface Props {
  onToast: (msg: string) => void;
}

function HerbSelector({ onToast }: Props) {
  const [herbs, setHerbs] = useState<string[]>([]);
  const [currentHerb, setCurrentHerb] = useState<string>("");
  const [selectedHerb, setSelectedHerb] = useState<string>("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [seedData, setSeedData] = useState<BankSeedData | null>(null);
  const [seedFetchDone, setSeedFetchDone] = useState(false);

  useEffect(() => {
    invoke<string[]>("get_valid_herbs").then(setHerbs);
    invoke<string>("get_current_herb")
      .then((herb) => {
        setCurrentHerb(herb);
        setSelectedHerb(herb);
      })
      .catch(() => {});
    invoke<BankSeedData>("get_herb_seeds")
      .then(setSeedData)
      .catch(() => {})
      .finally(() => setSeedFetchDone(true));
  }, []);

  const applyHerb = async (herb: string) => {
    if (!herb || herb === currentHerb || updating) return;
    setUpdating(herb);
    try {
      const result = await invoke<HerbUpdateResult>("update_herb", { herb });
      setCurrentHerb(result.newHerb);
      onToast(
        `Herb updated: ${result.oldHerb} → ${result.newHerb} (${result.keysUpdated} patches)`
      );
    } catch (e) {
      onToast(`Failed to update herb: ${e}`);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="farming-tab">
      {seedData ? (
        <div className="seed-bank">
          <div className="seed-bank-header">
            <div className="seed-bank-title">
              <h3>Farm Run Herb</h3>
              <span className="seed-hint">
                Click a herb to set your farm run
                {currentHerb && (
                  <>
                    {" · "}
                    <span className="herb-current">
                      {currentHerb.replace("_", " ")}
                    </span>
                  </>
                )}
              </span>
            </div>
            <span className="seed-snapshot">
              Snapshot: {seedData.snapshotDate}
            </span>
          </div>
          <div className="seed-grid">
            {seedData.seeds.map((s) => {
              const isActive = s.herb === currentHerb;
              const isUpdating = updating === s.herb;
              return (
                <button
                  key={s.herb}
                  type="button"
                  className={`seed-row ${isActive ? "seed-active" : ""} ${s.quantity === 0 ? "seed-empty" : ""} ${isUpdating ? "seed-updating" : ""}`}
                  onClick={() => applyHerb(s.herb)}
                  disabled={!!updating || isActive}
                  aria-pressed={isActive}
                  title={isActive ? "Current farm run herb" : `Set farm run to ${s.herb.replace("_", " ")}`}
                >
                  <span className="seed-name">{s.herb.replace("_", " ")}</span>
                  <span className="seed-qty">
                    {isUpdating ? "…" : s.quantity.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        // Fallback: bank seed data unavailable — keep the dropdown so the herb
        // can still be changed without the visual picker.
        seedFetchDone &&
        herbs.length > 0 && (
          <div className="herb-control">
            <div className="herb-control-header">
              <h3>Farm Run Herb</h3>
              {currentHerb && (
                <span className="herb-current">
                  Currently: {currentHerb.replace("_", " ")}
                </span>
              )}
            </div>
            <div className="herb-selector">
              <select
                value={selectedHerb}
                onChange={(e) => setSelectedHerb(e.target.value)}
              >
                {herbs.map((h) => (
                  <option key={h} value={h}>
                    {h.replace("_", " ")}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-primary"
                onClick={() => applyHerb(selectedHerb)}
                disabled={!!updating || selectedHerb === currentHerb}
              >
                {updating ? "Updating..." : "Apply"}
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default HerbSelector;
