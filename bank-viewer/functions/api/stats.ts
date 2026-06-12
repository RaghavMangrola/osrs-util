interface SkillStat {
  rank: number;
  level: number;
  experience: number;
}

interface StatsPayload {
  player: string;
  fetchedAt: string;
  cachedAt: string;
  cacheStatus: "hit" | "miss" | "stale";
  skills: Record<string, SkillStat>;
}

const DEFAULT_STATS_PLAYER = "funmaxxing";
const DEFAULT_CACHE_TTL_SECONDS = 6 * 60 * 60;

const SKILL_ORDER = [
  "overall",
  "attack",
  "defence",
  "strength",
  "hitpoints",
  "ranged",
  "prayer",
  "magic",
  "cooking",
  "woodcutting",
  "fletching",
  "fishing",
  "firemaking",
  "crafting",
  "smithing",
  "mining",
  "herblore",
  "agility",
  "thieving",
  "slayer",
  "farming",
  "runecraft",
  "hunter",
  "construction"
];

interface Env {
  BANK_KV: KVNamespace;
  STATS_PLAYER?: string;
  STATS_CACHE_TTL_SECONDS?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const player = env.STATS_PLAYER?.trim() || DEFAULT_STATS_PLAYER;

  const cacheKey = statsCacheKey(player);
  const cached = await readCachedStats(env, cacheKey);
  if (cached && isFresh(cached, cacheTtlSeconds(env))) {
    return json({ ...cached, cacheStatus: "hit" });
  }

  try {
    const payload: StatsPayload = {
      player,
      fetchedAt: new Date().toISOString(),
      cachedAt: new Date().toISOString(),
      cacheStatus: "miss",
      skills: await fetchHiscores(player)
    };

    await env.BANK_KV.put(cacheKey, JSON.stringify(payload));
    return json(payload);
  } catch (error) {
    if (cached) {
      return json({ ...cached, cacheStatus: "stale" });
    }

    return json({ error: error instanceof Error ? error.message : "Unable to load OSRS hiscores." }, 500);
  }
};

async function fetchHiscores(player: string): Promise<Record<string, SkillStat>> {
  const hiscoresUrl = `https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws?player=${encodeURIComponent(player)}`;
  const response = await fetch(hiscoresUrl, {
    headers: {
      accept: "text/plain"
    }
  });

  if (response.status === 404) {
    throw new Error("Player was not found on the OSRS hiscores.");
  }

  if (!response.ok) {
    throw new Error("Unable to load OSRS hiscores.");
  }

  return parseHiscores(await response.text());
}

async function readCachedStats(env: Env, key: string): Promise<StatsPayload | null> {
  const value = await env.BANK_KV.get(key);
  return value ? parseCachedStats(value) : null;
}

async function readLatestCachedStats(env: Env): Promise<StatsPayload | null> {
  const keys = await env.BANK_KV.list({ prefix: "stats:" });
  const cached = await Promise.all(keys.keys.map((key) => readCachedStats(env, key.name)));
  return cached
    .filter((payload): payload is StatsPayload => payload !== null)
    .sort((a, b) => Date.parse(b.cachedAt) - Date.parse(a.cachedAt))[0] || null;
}

function parseCachedStats(value: string): StatsPayload | null {
  try {
    const parsed = JSON.parse(value) as Partial<StatsPayload>;
    if (!parsed.player || !parsed.cachedAt || !parsed.fetchedAt || !parsed.skills) {
      return null;
    }

    return {
      player: parsed.player,
      fetchedAt: parsed.fetchedAt,
      cachedAt: parsed.cachedAt,
      cacheStatus: parsed.cacheStatus || "hit",
      skills: parsed.skills
    };
  } catch {
    return null;
  }
}

function statsCacheKey(player: string): string {
  return `stats:${player.toLowerCase().replace(/\s+/g, "_")}`;
}

function cacheTtlSeconds(env: Env): number {
  const ttl = Number(env.STATS_CACHE_TTL_SECONDS);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_CACHE_TTL_SECONDS;
}

function isFresh(payload: StatsPayload, ttlSeconds: number): boolean {
  return Date.now() - Date.parse(payload.cachedAt) < ttlSeconds * 1000;
}

function parseHiscores(text: string): Record<string, SkillStat> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < SKILL_ORDER.length) {
    throw new Error("Hiscores response did not include every skill.");
  }

  const skills: Record<string, SkillStat> = {};
  for (const [index, skill] of SKILL_ORDER.entries()) {
    const parts = lines[index].split(",").map((part) => Number(part));
    if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) {
      throw new Error(`Hiscores row for ${skill} is invalid.`);
    }

    skills[skill] = {
      rank: parts[0],
      level: parts[1],
      experience: parts[2]
    };
  }

  return skills;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
