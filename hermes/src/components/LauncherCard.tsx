import { LauncherConfig } from "../types";

interface Props {
  launcher: LauncherConfig;
  onLaunch: (l: LauncherConfig) => void;
  onEdit: (l: LauncherConfig) => void;
  onDelete: (id: string) => void;
}

function LauncherCard({ launcher, onLaunch, onEdit, onDelete }: Props) {
  return (
    <div className="launcher-card" onClick={() => onLaunch(launcher)}>
      <div className="card-icon">{launcher.icon || "🚀"}</div>
      <div className="card-info">
        <h3>{launcher.name}</h3>
        <div className="card-path">{launcher.executable}</div>
        {launcher.arguments && (
          <div className="card-args">{launcher.arguments}</div>
        )}
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
