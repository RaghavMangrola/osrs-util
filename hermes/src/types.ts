export interface LauncherConfig {
  id: string;
  name: string;
  executable: string;
  arguments: string;
  workingDirectory: string;
  category: string;
  icon: string;
  envVars: Record<string, string>;
}

export type LauncherFormData = Omit<LauncherConfig, "id">;
