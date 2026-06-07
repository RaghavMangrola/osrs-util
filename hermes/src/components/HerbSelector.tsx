import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

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
  const [loading, setLoading] = useState(false);
  const [seedData, setSeedData] = useState<BankSeedData | null>(null);

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
      .catch(() => {});
  }, []);

  const handleApply = async () => {
    if (!selectedHerb || selectedHerb === currentHerb) return;
    setLoading(true);
    try {
      const result = await invoke<HerbUpdateResult>("update_herb", {
        herb: selectedHerb,
      });
      setCurrentHerb(result.newHerb);
      onToast(
        `Herb updated: ${result.oldHerb} → ${result.newHerb} (${result.keysUpdated} patches)`
      );
    } catch (e) {
      onToast(`Failed to update herb: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="farming-tab">
      {herbs.length > 0 && (
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
              onClick={handleApply}
              disabled={loading || selectedHerb === currentHerb}
            >
              {loading ? "Updating..." : "Apply"}
            </button>
          </div>
        </div>
      )}

      {seedData && (
        <div className="seed-bank">
          <div className="seed-bank-header">
            <h3>Herb Seeds in Bank</h3>
            <span className="seed-snapshot">
              Snapshot: {seedData.snapshotDate}
            </span>
          </div>
          <div className="seed-grid">
            {seedData.seeds.map((s) => (
              <div
                key={s.herb}
                className={`seed-row ${s.herb === currentHerb ? "seed-active" : ""} ${s.quantity === 0 ? "seed-empty" : ""}`}
              >
                <span className="seed-name">{s.herb.replace("_", " ")}</span>
                <span className="seed-qty">
                  {s.quantity.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default HerbSelector;
