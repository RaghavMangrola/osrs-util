import { LauncherConfig } from "../types";

interface Props {
  launcher: LauncherConfig;
  onLaunch: (l: LauncherConfig) => void;
  onEdit: (l: LauncherConfig) => void;
  onDuplicate: (l: LauncherConfig) => void;
  onDelete: (id: string) => void;
}

// Decorative ticket flourishes — derive a stable 3-letter "route code" (flight
// style) from a label, and a short serial from the launcher id. Purely visual;
// they don't carry meaning beyond selling the boarding-pass look.
function routeCode(s: string): string {
  const letters = (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (letters + "XXX").slice(0, 3);
}

function serialOf(id: string): string {
  const s = (id || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return (s + "000000").slice(0, 6);
}

function LauncherCard({ launcher, onLaunch, onEdit, onDuplicate, onDelete }: Props) {
  const origin = routeCode(launcher.category || "General");
  const dest = routeCode(launcher.name);

  return (
    <div className="launcher-card" onClick={() => onLaunch(launcher)}>
      <div className="ticket-main">
        <div className="ticket-top">
          <span className="ticket-brand">Hermes · Launch Bureau</span>
          <span className="ticket-serial">№ {serialOf(launcher.id)}</span>
        </div>

        <div className="card-info">
          <h3>{launcher.name}</h3>
          <div className="card-path">{launcher.executable}</div>
          {launcher.arguments && (
            <div className="card-args">{launcher.arguments}</div>
          )}
        </div>

        <div className="ticket-route" aria-hidden="true">
          <span className="route-code">{origin}</span>
          <span className="route-dash">
            <span className="route-plane">✈</span>
          </span>
          <span className="route-code">{dest}</span>
        </div>
      </div>

      <div className="ticket-stub">
        <div className="card-icon">{launcher.icon || "🚀"}</div>
        <span className="stub-label">Boarding Pass</span>
        <span className="ticket-barcode" aria-hidden="true" />
      </div>

      <div className="card-actions">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(launcher);
          }}
          title="Edit"
        >
          ✏️
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(launcher);
          }}
          title="Duplicate"
        >
          ⧉
        </button>
        <button
          className="delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(launcher.id);
          }}
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

export default LauncherCard;
