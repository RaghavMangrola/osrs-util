import { useState } from "react";
import { LauncherConfig, LauncherFormData } from "../types";

interface Props {
  initial: LauncherConfig | null;
  onSave: (data: LauncherFormData) => void;
  onClose: () => void;
}

const ICONS = ["🚀", "⚡", "🎮", "🛠️", "💻", "🌐", "📁", "🎵", "📊", "🔧", "🎨", "📝"];

function LauncherModal({ initial, onSave, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [executable, setExecutable] = useState(initial?.executable ?? "");
  const [args, setArgs] = useState(initial?.arguments ?? "");
  const [workingDirectory, setWorkingDirectory] = useState(
    initial?.workingDirectory ?? "",
  );
  const [category, setCategory] = useState(initial?.category ?? "General");
  const [icon, setIcon] = useState(initial?.icon ?? "🚀");
  const [envVars, setEnvVars] = useState<[string, string][]>(
    initial?.envVars ? Object.entries(initial.envVars) : [],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const envObj: Record<string, string> = {};
    for (const [k, v] of envVars) {
      if (k.trim()) envObj[k.trim()] = v;
    }
    onSave({
      name,
      executable,
      arguments: args,
      workingDirectory,
      category,
      icon,
      envVars: envObj,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{initial ? "Edit Launcher" : "New Launcher"}</h2>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Icon</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  style={{
                    fontSize: 20,
                    padding: "6px 8px",
                    background: icon === i ? "var(--accent-dim)" : "transparent",
                    border:
                      icon === i
                        ? "2px solid var(--accent)"
                        : "2px solid transparent",
                    borderRadius: "var(--radius)",
                    cursor: "pointer",
                  }}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My App"
                required
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="General"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Executable Path</label>
            <input
              type="text"
              value={executable}
              onChange={(e) => setExecutable(e.target.value)}
              placeholder='C:\Program Files\MyApp\app.exe'
              required
            />
          </div>

          <div className="form-group">
            <label>Arguments</label>
            <input
              type="text"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder="--config production --port 8080"
            />
          </div>

          <div className="form-group">
            <label>Working Directory</label>
            <input
              type="text"
              value={workingDirectory}
              onChange={(e) => setWorkingDirectory(e.target.value)}
              placeholder='C:\Program Files\MyApp'
            />
          </div>

          <div className="form-group">
            <label>Environment Variables</label>
            <div className="env-vars">
              {envVars.map(([key, val], idx) => (
                <div key={idx} className="env-var-row">
                  <input
                    type="text"
                    placeholder="KEY"
                    value={key}
                    onChange={(e) => {
                      const next = [...envVars];
                      next[idx] = [e.target.value, val];
                      setEnvVars(next);
                    }}
                  />
                  <input
                    type="text"
                    placeholder="value"
                    value={val}
                    onChange={(e) => {
                      const next = [...envVars];
                      next[idx] = [key, e.target.value];
                      setEnvVars(next);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setEnvVars(envVars.filter((_, i) => i !== idx))}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="add-env-btn"
                onClick={() => setEnvVars([...envVars, ["", ""]])}
              >
                + Add Variable
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {initial ? "Save Changes" : "Add Launcher"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LauncherModal;
