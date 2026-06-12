interface Env {
  BANK_KV: KVNamespace;
  BANK_KEY?: string;
}

interface BankItem {
  id?: number;
  name: string;
  quantity: number;
  iconUrl?: string;
  levelRequirements?: LevelRequirements;
}

interface SecondaryBankItem extends BankItem {
  seed?: BankItem;
}

interface PotionBankItem extends BankItem {
  secondaryIndexes: number[];
  bankedFourDose: BankItem;
  craftable: number;
  bottlenecks: IngredientBottleneck[];
  missingForTarget: number;
  recommendedActions: RecommendedAction[];
  targetFourDose?: number;
  criticalThreshold?: number;
  stockStatus: PotionStockStatus;
  advisorPriority: number;
}

interface HerbDefinition {
  key: string;
  name: string;
  cleanId: number;
  grimyId: number;
  seedId: number;
  farmingLevel: number;
  unfinishedPotionId: number;
  unfinishedPotionName: string;
  secondaries: SecondaryDefinition[];
  potions: PotionDefinition[];
}

interface HerbRow {
  key: string;
  name: string;
  clean: BankItem;
  grimy: BankItem;
  seed: BankItem;
  unfinished: BankItem;
  total: number;
  availableHerb: number;
  levelRequirements: LevelRequirements;
  secondaries: SecondaryBankItem[];
  potions: PotionBankItem[];
}

interface SecondaryDefinition {
  name: string;
  id: number;
  seedId?: number;
  farmingLevel?: number;
}

interface PotionDefinition {
  name: string;
  id: number;
  herbloreLevel: number;
  secondaryIndexes?: number[];
  doseIds?: [number, number, number, number];
  iconUrl?: string;
}

interface PotionTarget {
  targetFourDose: number;
  criticalThreshold: number;
  priority: number;
}

interface IngredientBottleneck {
  type: "herb" | "secondary";
  item: BankItem;
  quantity: number;
  neededForTarget: number;
  shortfallForTarget: number;
}

interface RecommendedAction {
  type: "make" | "plant" | "collect" | "source";
  label: string;
  item?: BankItem;
  quantity?: number;
  reason: string;
  skill?: "herblore" | "farming";
  levelRequired?: number;
}

interface FoodDefinition {
  id: number;
  name: string;
  heal: number;
  levelRequired?: number;
  category: "fish" | "cooked" | "combo" | "other";
  priority: number;
}

interface FoodAdvisorRow extends BankItem {
  heal: number;
  totalHealing: number;
  category: FoodDefinition["category"];
  levelRequirements?: LevelRequirements;
  advisorPriority: number;
}

interface FarmingAdvisor {
  herbs: FarmingAdvisorRow[];
  flowerPatches: FarmingAdvisorRow[];
  allotments: FarmingAdvisorRow[];
}

interface FarmingAdvisorRow {
  key: string;
  patchType: "herb" | "flower" | "allotment";
  name: string;
  crop: BankItem;
  seed: BankItem;
  targetPotion?: BankItem;
  bankedFourDose?: BankItem;
  targetFourDose?: number;
  missingForTarget: number;
  missingCrop: number;
  availableCrop: number;
  craftable: number;
  secondaryShortfalls: IngredientBottleneck[];
  status: FarmingAdvisorStatus;
  summary: string;
  recommendedActions: RecommendedAction[];
  levelRequirements: LevelRequirements;
  seedsPerPatch?: number;
  availablePlantings?: number;
  advisorPriority: number;
}

interface FarmingCropDefinition {
  key: string;
  patchType: "flower" | "allotment";
  name: string;
  cropId: number;
  seedId: number;
  farmingLevel: number;
  seedsPerPatch: number;
  priority: number;
}

interface SupplyAdvisorRow {
  key: string;
  name: string;
  item: BankItem;
  quantity: number;
  targetQuantity: number;
  criticalThreshold: number;
  status: "critical" | "low" | "ok";
  summary: string;
  recommendedActions: RecommendedAction[];
  advisorPriority: number;
}

interface RecommendationContext {
  potion: PotionDefinition;
  herb: HerbDefinition;
  seed: BankItem;
  quantities: Map<number, number>;
  secondaryIndexes: number[];
  bankedFourDoseQuantity: number;
  craftable: number;
  missingForTarget: number;
  target?: PotionTarget;
}

interface PotionIngredient {
  type: "herb" | "secondary";
  item: SecondaryBankItem;
  quantity: number;
}

interface LevelRequirements {
  herblore?: number;
  farming?: number;
  cooking?: number;
}

type PotionStockStatus = "critical" | "low" | "ok" | "craftable" | "untracked";
type FarmingAdvisorStatus = "critical" | "low" | "ready" | "blocked" | "ok";

type RawRecord = Record<string, unknown>;

const POTION_DOSE_IDS = new Map<string, [number, number, number, number]>([
  ["Attack potion", [2428, 121, 123, 125]],
  ["Antipoison", [2446, 175, 177, 179]],
  ["Strength potion", [113, 115, 117, 119]],
  ["Serum 207", [3408, 3410, 3412, 3414]],
  ["Restore potion", [2430, 127, 129, 131]],
  ["Energy potion", [3008, 3010, 3012, 3014]],
  ["Combat potion", [9739, 9741, 9743, 9745]],
  ["Guthix rest", [4417, 4419, 4421, 4423]],
  ["Defence potion", [2432, 133, 135, 137]],
  ["Prayer potion", [2434, 139, 141, 143]],
  ["Agility potion", [3032, 3034, 3036, 3038]],
  ["Saradomin brew", [6685, 6687, 6689, 6691]],
  ["Super attack", [2436, 145, 147, 149]],
  ["Superantipoison", [2448, 181, 183, 185]],
  ["Fishing potion", [2438, 151, 153, 155]],
  ["Super energy", [3016, 3018, 3020, 3022]],
  ["Hunter potion", [9998, 10000, 10002, 10004]],
  ["Super strength", [2440, 157, 159, 161]],
  ["Super restore", [3024, 3026, 3028, 3030]],
  ["Sanfew serum", [10925, 10927, 10929, 10931]],
  ["Super defence", [2442, 163, 165, 167]],
  ["Bastion potion", [22461, 22464, 22467, 22470]],
  ["Battlemage potion", [22449, 22452, 22455, 22458]],
  ["Magic potion", [3040, 3042, 3044, 3046]],
  ["Antifire potion", [2452, 2454, 2456, 2458]],
  ["Ranging potion", [2444, 169, 171, 173]],
  ["Zamorak brew", [2450, 189, 191, 193]],
  ["Super combat potion", [12695, 12697, 12699, 12701]],
  ["Anti-venom+", [12913, 12915, 12917, 12919]],
  ["Anti-venom(4)", [12905, 12907, 12909, 12911]]
]);

const POTION_TARGETS = new Map<string, PotionTarget>([
  ["Prayer potion", { targetFourDose: 100, criticalThreshold: 25, priority: 10 }],
  ["Super restore", { targetFourDose: 100, criticalThreshold: 25, priority: 20 }],
  ["Saradomin brew", { targetFourDose: 100, criticalThreshold: 25, priority: 30 }],
  ["Super combat potion", { targetFourDose: 100, criticalThreshold: 25, priority: 40 }],
  ["Super attack", { targetFourDose: 100, criticalThreshold: 25, priority: 50 }],
  ["Super strength", { targetFourDose: 100, criticalThreshold: 25, priority: 60 }],
  ["Super defence", { targetFourDose: 100, criticalThreshold: 25, priority: 70 }],
  ["Ranging potion", { targetFourDose: 100, criticalThreshold: 25, priority: 80 }],
  ["Antifire potion", { targetFourDose: 100, criticalThreshold: 25, priority: 90 }],
  ["Anti-venom+", { targetFourDose: 100, criticalThreshold: 25, priority: 100 }],
  ["Super energy", { targetFourDose: 100, criticalThreshold: 25, priority: 110 }],
  ["Energy potion", { targetFourDose: 100, criticalThreshold: 25, priority: 120 }]
]);

const ADVISOR_MODULES = [
  { key: "potions", name: "Potion bottlenecks", status: "active" },
  { key: "farming", name: "Farming", status: "active" },
  { key: "food", name: "Food", status: "active" },
  { key: "runes", name: "Runes", status: "placeholder" },
  { key: "activities", name: "Slayer/PvM", status: "active" }
];

const PVM_SUPPLY_TARGETS = [
  { key: "prayer", name: "Prayer restore", potionNames: ["Prayer potion", "Super restore"], targetQuantity: 150, criticalThreshold: 40, priority: 10 },
  { key: "food", name: "Healing food", targetQuantity: 500, criticalThreshold: 120, priority: 20 },
  { key: "melee", name: "Melee boost", potionNames: ["Super attack", "Super strength"], targetQuantity: 100, criticalThreshold: 25, priority: 30 },
  { key: "defence", name: "Defence boost", potionNames: ["Super defence"], targetQuantity: 80, criticalThreshold: 20, priority: 40 },
  { key: "ranged", name: "Ranged boost", potionNames: ["Ranging potion"], targetQuantity: 80, criticalThreshold: 20, priority: 50 },
  { key: "fire", name: "Dragonfire", potionNames: ["Antifire potion"], targetQuantity: 50, criticalThreshold: 12, priority: 60 },
  { key: "poison", name: "Poison cure", potionNames: ["Superantipoison", "Antipoison"], targetQuantity: 30, criticalThreshold: 8, priority: 70 },
  { key: "run", name: "Run energy", potionNames: ["Super energy", "Energy potion"], targetQuantity: 50, criticalThreshold: 12, priority: 80 }
];

const FOOD_DEFINITIONS: FoodDefinition[] = [
  foodDefinition(315, "Shrimps", 3, 1, "fish", 900),
  foodDefinition(325, "Sardine", 4, 1, "fish", 890),
  foodDefinition(333, "Trout", 7, 15, "fish", 820),
  foodDefinition(329, "Salmon", 9, 25, "fish", 780),
  foodDefinition(361, "Tuna", 10, 30, "fish", 740),
  foodDefinition(379, "Lobster", 12, 40, "fish", 680),
  foodDefinition(365, "Bass", 13, 43, "fish", 650),
  foodDefinition(373, "Swordfish", 14, 45, "fish", 620),
  foodDefinition(7946, "Monkfish", 16, 62, "fish", 520),
  foodDefinition(385, "Shark", 20, 76, "fish", 360),
  foodDefinition(397, "Sea turtle", 21, 82, "fish", 300),
  foodDefinition(391, "Manta ray", 22, 81, "fish", 260),
  foodDefinition(13441, "Anglerfish", 22, 84, "fish", 120),
  foodDefinition(3144, "Cooked karambwan", 18, 30, "combo", 180),
  foodDefinition(7198, "Tuna potato", 22, 68, "cooked", 240),
  foodDefinition(2297, "Anchovy pizza", 18, undefined, "cooked", 420),
  foodDefinition(1897, "Chocolate cake", 15, undefined, "cooked", 580),
  foodDefinition(1891, "Cake", 12, undefined, "cooked", 720),
  foodDefinition(2309, "Bread", 5, undefined, "cooked", 860),
  foodDefinition(1971, "Kebab", 4, undefined, "other", 920)
];

const FOODS = new Map(FOOD_DEFINITIONS.map((food) => [food.id, food.name]));
const FOOD_NAMES = new Set(FOOD_DEFINITIONS.map((food) => normalizeName(food.name)));

const FLOWER_CROP_DEFINITIONS: FarmingCropDefinition[] = [
  farmingCropDefinition("limpwurt", "flower", "Limpwurt root", 225, 5100, 26, 1, 10)
];

const ALLOTMENT_CROP_DEFINITIONS: FarmingCropDefinition[] = [
  farmingCropDefinition("snape_grass", "allotment", "Snape grass", 231, 22879, 61, 3, 10),
  farmingCropDefinition("watermelon", "allotment", "Watermelon", 5982, 5321, 47, 3, 20),
  farmingCropDefinition("strawberry", "allotment", "Strawberry", 5504, 5323, 31, 3, 30),
  farmingCropDefinition("sweetcorn", "allotment", "Sweetcorn", 5986, 5320, 20, 3, 40),
  farmingCropDefinition("tomato", "allotment", "Tomato", 1982, 5322, 12, 3, 50),
  farmingCropDefinition("cabbage", "allotment", "Cabbage", 1965, 5324, 7, 3, 60),
  farmingCropDefinition("onion", "allotment", "Onion", 1957, 5319, 5, 3, 70),
  farmingCropDefinition("potato", "allotment", "Potato", 1942, 5318, 1, 3, 80)
];

const HERB_DEFINITIONS: HerbDefinition[] = [
  herbDefinition("guam", "Guam leaf", 249, 199, 5291, 9, 91, "Guam potion (unf)", secondaries([["Eye of newt", 221]]), potions([["Attack potion", 121, 3]])),
  herbDefinition("marrentill", "Marrentill", 251, 201, 5292, 14, 93, "Marrentill potion (unf)", secondaries([["Unicorn horn dust", 235]]), potions([["Antipoison", 175, 5]])),
  herbDefinition("tarromin", "Tarromin", 253, 203, 5293, 19, 95, "Tarromin potion (unf)", secondaries([["Limpwurt root", 225, 5100, 26], ["Ashes", 592]]), potions([["Strength potion", 115, 12], ["Serum 207", 3408, 15]])),
  herbDefinition("harralander", "Harralander", 255, 205, 5294, 26, 97, "Harralander potion (unf)", secondaries([["Red spiders' eggs", 223], ["Chocolate dust", 1975], ["Goat horn dust", 9736], ["Swamp tar", 1939]]), potions([["Restore potion", 127, 22], ["Energy potion", 3010, 26], ["Combat potion", 9741, 36], ["Guthix rest", 4417, 18]])),
  herbDefinition("ranarr", "Ranarr weed", 257, 207, 5295, 32, 99, "Ranarr potion (unf)", secondaries([["White berries", 239, 5105, 59], ["Snape grass", 231, 22879, 61]]), potions([["Defence potion", 133, 30], ["Prayer potion", 139, 38]])),
  herbDefinition("toadflax", "Toadflax", 2998, 3049, 5296, 38, 3002, "Toadflax potion (unf)", secondaries([["Toad's legs", 2152], ["Crushed nest", 6693]]), potions([["Agility potion", 3034, 34], ["Saradomin brew", 6687, 81]])),
  herbDefinition("irit", "Irit leaf", 259, 209, 5297, 44, 101, "Irit potion (unf)", secondaries([["Eye of newt", 221], ["Unicorn horn dust", 235]]), potions([["Super attack", 145, 45], ["Superantipoison", 181, 48]])),
  herbDefinition("avantoe", "Avantoe", 261, 211, 5298, 50, 103, "Avantoe potion (unf)", secondaries([["Snape grass", 231, 22879, 61], ["Mort myre fungus", 2970], ["Kebbit teeth dust", 10111]]), potions([["Fishing potion", 151, 50], ["Super energy", 3018, 52], ["Hunter potion", 10000, 53]])),
  herbDefinition("kwuarm", "Kwuarm", 263, 213, 5299, 56, 105, "Kwuarm potion (unf)", secondaries([["Limpwurt root", 225, 5100, 26], ["Dragon scale dust", 241]]), potions([["Super strength", 157, 55], ["Weapon poison", 187, 60]])),
  herbDefinition("snapdragon", "Snapdragon", 3000, 3051, 5300, 62, 3004, "Snapdragon potion (unf)", secondaries([["Red spiders' eggs", 223], ["Unicorn horn dust", 235], ["Nail beast nails", 10937]]), potions([["Super restore", 3026, 63], ["Sanfew serum", 10927, 65]])),
  herbDefinition("cadantine", "Cadantine", 265, 215, 5301, 67, 107, "Cadantine potion (unf)", secondaries([["White berries", 239, 5105, 59], ["Wine of zamorak", 245], ["Potato cactus", 3138, 22873, 64]]), potions([["Super defence", 163, 66], ["Bastion potion", 22461, 80], ["Battlemage potion", 22449, 80]])),
  herbDefinition("lantadyme", "Lantadyme", 2481, 2485, 5302, 73, 2483, "Lantadyme potion (unf)", secondaries([["Potato cactus", 3138, 22873, 64], ["Dragon scale dust", 241]]), potions([["Magic potion", 3042, 76], ["Antifire potion", 2454, 69]])),
  herbDefinition("dwarf_weed", "Dwarf weed", 267, 217, 5303, 79, 109, "Dwarf weed potion (unf)", secondaries([["Wine of zamorak", 245], ["Cactus spine", 6016, 5280, 55]]), potions([["Ranging potion", 169, 72], ["Weapon poison+", 5937, 73]])),
  herbDefinition("torstol", "Torstol", 269, 219, 5304, 85, 111, "Torstol potion (unf)", secondaries([["Jangerberries", 247, 5104, 48], ["Super attack(4)", 2436], ["Super strength(4)", 2440], ["Super defence(4)", 2442], ["Anti-venom(4)", 12905]]), potions([["Zamorak brew", 189, 78, [0]], ["Super combat potion", 12697, 90, [1, 2, 3]], ["Anti-venom+", 12913, 94, [4]]]))
];

function herbDefinition(
  key: string,
  name: string,
  cleanId: number,
  grimyId: number,
  seedId: number,
  farmingLevel: number,
  unfinishedPotionId: number,
  unfinishedPotionName: string,
  secondaries: SecondaryDefinition[],
  potions: PotionDefinition[]
): HerbDefinition {
  return { key, name, cleanId, grimyId, seedId, farmingLevel, unfinishedPotionId, unfinishedPotionName, secondaries, potions };
}

function secondaries(entries: Array<[name: string, id: number, seedId?: number, farmingLevel?: number]>): SecondaryDefinition[] {
  return entries.map(([name, id, seedId, farmingLevel]) => ({ name, id, seedId, farmingLevel }));
}

function potions(entries: Array<[name: string, id: number, herbloreLevel: number, secondaryIndexes?: number[]]>): PotionDefinition[] {
  return entries.map(([name, id, herbloreLevel, secondaryIndexes]) => ({
    name,
    id,
    herbloreLevel,
    secondaryIndexes,
    doseIds: POTION_DOSE_IDS.get(name),
    iconUrl: itemIconUrl(id)
  }));
}

function foodDefinition(
  id: number,
  name: string,
  heal: number,
  levelRequired: number | undefined,
  category: FoodDefinition["category"],
  priority: number
): FoodDefinition {
  return { id, name, heal, levelRequired, category, priority };
}

function farmingCropDefinition(
  key: string,
  patchType: FarmingCropDefinition["patchType"],
  name: string,
  cropId: number,
  seedId: number,
  farmingLevel: number,
  seedsPerPatch: number,
  priority: number
): FarmingCropDefinition {
  return { key, patchType, name, cropId, seedId, farmingLevel, seedsPerPatch, priority };
}

const HERBS = new Map<number, string>([
  [199, "Grimy guam leaf"],
  [201, "Grimy marrentill"],
  [203, "Grimy tarromin"],
  [205, "Grimy harralander"],
  [207, "Grimy ranarr weed"],
  [209, "Grimy irit leaf"],
  [211, "Grimy avantoe"],
  [213, "Grimy kwuarm"],
  [215, "Grimy cadantine"],
  [217, "Grimy dwarf weed"],
  [219, "Grimy torstol"],
  [249, "Guam leaf"],
  [251, "Marrentill"],
  [253, "Tarromin"],
  [255, "Harralander"],
  [257, "Ranarr weed"],
  [259, "Irit leaf"],
  [261, "Avantoe"],
  [263, "Kwuarm"],
  [265, "Cadantine"],
  [267, "Dwarf weed"],
  [269, "Torstol"],
  [2481, "Lantadyme"],
  [2485, "Grimy lantadyme"],
  [2998, "Toadflax"],
  [3000, "Snapdragon"],
  [3049, "Grimy toadflax"],
  [3051, "Grimy snapdragon"]
]);

const SEEDS = new Map<number, string>([
  [5100, "Limpwurt seed"],
  [5104, "Jangerberry seed"],
  [5105, "Whiteberry seed"],
  [5280, "Cactus seed"],
  [5318, "Potato seed"],
  [5319, "Onion seed"],
  [5320, "Sweetcorn seed"],
  [5321, "Watermelon seed"],
  [5322, "Tomato seed"],
  [5323, "Strawberry seed"],
  [5324, "Cabbage seed"],
  [5291, "Guam seed"],
  [5292, "Marrentill seed"],
  [5293, "Tarromin seed"],
  [5294, "Harralander seed"],
  [5295, "Ranarr seed"],
  [5296, "Toadflax seed"],
  [5297, "Irit seed"],
  [5298, "Avantoe seed"],
  [5299, "Kwuarm seed"],
  [5300, "Snapdragon seed"],
  [5301, "Cadantine seed"],
  [5302, "Lantadyme seed"],
  [5303, "Dwarf weed seed"],
  [5304, "Torstol seed"],
  [22873, "Potato cactus seed"],
  [22879, "Snape grass seed"]
]);

const HERB_NAMES = new Set([...HERBS.values()].map(normalizeName));
const SEED_NAMES = new Set([...SEEDS.values()].map(normalizeName));

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const raw = await readBankPayload(env);
    if (!raw) {
      return json({ error: "No bank data found. Set BANK_KEY or add a JSON bank payload to the KV namespace." }, 404);
    }

    const parsed: unknown = JSON.parse(raw.value);
    const items = extractItems(parsed);
    const herbs = buildHerbRows(items);
    const seeds = mergeAndSort(items.filter((item) => isSeed(item)), SEEDS);
    const food = buildFoodAdvisor(items);
    const farming = buildFarmingAdvisor(herbs, items);
    const pvm = buildPvmAdvisor(herbs, food);

    return json({
      sourceKey: raw.key,
      herbs,
      seeds,
      advisor: {
        modules: ADVISOR_MODULES,
        farming,
        food,
        pvm
      }
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to read bank data." }, 500);
  }
};

async function readBankPayload(env: Env): Promise<{ key: string; value: string } | null> {
  if (env.BANK_KEY) {
    const value = await env.BANK_KV.get(env.BANK_KEY);
    return value ? { key: env.BANK_KEY, value } : null;
  }

  const keys = await env.BANK_KV.list();
  for (const key of keys.keys) {
    const value = await env.BANK_KV.get(key.name);
    if (value && looksLikeBankPayload(value)) {
      return { key: key.name, value };
    }
  }

  return null;
}

function looksLikeBankPayload(value: string): boolean {
  try {
    const parsed: unknown = JSON.parse(value);
    return extractItems(parsed).length > 0;
  } catch {
    return false;
  }
}

function extractItems(value: unknown): BankItem[] {
  const candidates = findItemArrays(value);
  const items = candidates.flatMap((candidate) => candidate.map(normalizeItem).filter((item): item is BankItem => item !== null));
  return items.length ? items : findItemMaps(value);
}

function findItemArrays(value: unknown): unknown[][] {
  const arrays: unknown[][] = [];
  const seen = new Set<unknown>();

  function visit(node: unknown): void {
    if (!node || typeof node !== "object" || seen.has(node)) {
      return;
    }
    seen.add(node);

    if (Array.isArray(node)) {
      if (node.some((entry) => normalizeItem(entry))) {
        arrays.push(node);
      }
      for (const entry of node) {
        visit(entry);
      }
      return;
    }

    for (const child of Object.values(node as RawRecord)) {
      visit(child);
    }
  }

  visit(value);
  return arrays;
}

function findItemMaps(value: unknown): BankItem[] {
  const maps: BankItem[][] = [];
  const seen = new Set<unknown>();

  function visit(node: unknown): void {
    if (!node || typeof node !== "object" || Array.isArray(node) || seen.has(node)) {
      return;
    }
    seen.add(node);

    const items = Object.entries(node as RawRecord)
      .map(([key, quantity]) => {
        const id = Number(key);
        const count = numberFrom(quantity);
        if (!Number.isFinite(id) || count <= 0) {
          return null;
        }
        return normalizeItem({ id, quantity: count });
      })
      .filter((item): item is BankItem => item !== null);

    if (items.length) {
      maps.push(items);
    }

    for (const child of Object.values(node as RawRecord)) {
      visit(child);
    }
  }

  visit(value);
  return maps.flat();
}

function normalizeItem(value: unknown): BankItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as RawRecord;
  const id = numberFrom(firstDefined(record.id, record.itemId, record.item_id, record.item, record.itemID));
  const quantity = numberFrom(firstDefined(record.quantity, record.qty, record.count, record.amount, record.stack));
  const explicitName = stringFrom(firstDefined(record.name, record.itemName, record.item_name));
  const name = explicitName || (Number.isFinite(id) ? HERBS.get(id) || SEEDS.get(id) || FOODS.get(id) || "" : "");

  if ((!Number.isFinite(id) && !name) || quantity <= 0) {
    return null;
  }

  return {
    id: Number.isFinite(id) ? id : undefined,
    name,
    quantity
  };
}

function isHerb(item: BankItem): boolean {
  return (item.id !== undefined && HERBS.has(item.id)) || HERB_NAMES.has(normalizeName(item.name));
}

function isSeed(item: BankItem): boolean {
  return (item.id !== undefined && SEEDS.has(item.id)) || SEED_NAMES.has(normalizeName(item.name));
}

function isFood(item: BankItem): boolean {
  return (item.id !== undefined && FOODS.has(item.id)) || FOOD_NAMES.has(normalizeName(item.name));
}

function buildHerbRows(items: BankItem[]): HerbRow[] {
  const quantities = new Map<number, number>();
  for (const item of items) {
    if (item.id === undefined) {
      continue;
    }
    quantities.set(item.id, (quantities.get(item.id) || 0) + item.quantity);
  }

  return HERB_DEFINITIONS.map((herb) => {
    const cleanQuantity = quantities.get(herb.cleanId) || 0;
    const grimyQuantity = quantities.get(herb.grimyId) || 0;
    const unfinishedQuantity = quantities.get(herb.unfinishedPotionId) || 0;
    const total = cleanQuantity + grimyQuantity;
    const availableHerb = total + unfinishedQuantity;
    const seed = itemStack(herb.seedId, SEEDS.get(herb.seedId) || `${herb.name} seed`, quantities.get(herb.seedId) || 0, {
      farming: herb.farmingLevel
    });

    return {
      key: herb.key,
      name: herb.name,
      clean: itemStack(herb.cleanId, HERBS.get(herb.cleanId) || herb.name, cleanQuantity, {
        herblore: herb.potions[0]?.herbloreLevel
      }),
      grimy: itemStack(herb.grimyId, HERBS.get(herb.grimyId) || `Grimy ${herb.name.toLowerCase()}`, grimyQuantity, {
        herblore: herb.potions[0]?.herbloreLevel
      }),
      seed,
      unfinished: itemStack(herb.unfinishedPotionId, herb.unfinishedPotionName, unfinishedQuantity),
      total,
      availableHerb,
      levelRequirements: {
        farming: herb.farmingLevel
      },
      secondaries: herb.secondaries.map((secondary) => secondaryStack(secondary, quantities)),
      potions: herb.potions.map((potion, index) => {
        const secondaryIndexes = potion.secondaryIndexes || [index];
        const bankedFourDoseQuantity = bankedFourDosePotionQuantity(potion, quantities, items);
        const bankedFourDoseId = potion.doseIds?.[0] || potion.id;
        const craftable = craftablePotionQuantity(availableHerb, herb.secondaries, quantities, secondaryIndexes);
        const target = POTION_TARGETS.get(potion.name);
        const missingForTarget = target ? Math.max(0, target.targetFourDose - bankedFourDoseQuantity) : 0;
        const bottlenecks = buildPotionBottlenecks(herb, quantities, secondaryIndexes, availableHerb, missingForTarget);
        const stockStatus = potionStockStatus(bankedFourDoseQuantity, craftable, target);
        const recommendedActions = buildRecommendedActions({
          potion,
          herb,
          seed,
          quantities,
          secondaryIndexes,
          bankedFourDoseQuantity,
          craftable,
          missingForTarget,
          target
        });

        return {
          ...itemStack(potion.id, potion.name, craftable, {
            herblore: potion.herbloreLevel
          }),
          secondaryIndexes,
          bankedFourDose: itemStack(bankedFourDoseId, `${potion.name} banked`, bankedFourDoseQuantity),
          craftable,
          bottlenecks,
          missingForTarget,
          recommendedActions,
          ...(target
            ? {
                targetFourDose: target.targetFourDose,
                criticalThreshold: target.criticalThreshold
              }
            : {}),
          stockStatus,
          advisorPriority: advisorPriority(stockStatus, missingForTarget, target)
        };
      })
    };
  });
}

function buildFoodAdvisor(items: BankItem[]): FoodAdvisorRow[] {
  const quantities = new Map<number, number>();
  const nameQuantities = new Map<string, number>();

  for (const item of items) {
    if (!isFood(item)) {
      continue;
    }

    if (item.id !== undefined) {
      quantities.set(item.id, (quantities.get(item.id) || 0) + item.quantity);
    } else {
      const key = normalizeName(item.name);
      nameQuantities.set(key, (nameQuantities.get(key) || 0) + item.quantity);
    }
  }

  return FOOD_DEFINITIONS.map((food) => {
    const quantity = quantities.get(food.id) || nameQuantities.get(normalizeName(food.name)) || 0;
    return {
      ...itemStack(food.id, food.name, quantity, food.levelRequired ? { cooking: food.levelRequired } : undefined),
      heal: food.heal,
      totalHealing: quantity * food.heal,
      category: food.category,
      advisorPriority: foodAdvisorPriority(food, quantity)
    };
  })
    .filter((food) => food.quantity > 0)
    .sort((a, b) => a.advisorPriority - b.advisorPriority || b.totalHealing - a.totalHealing || a.name.localeCompare(b.name));
}

function foodAdvisorPriority(food: FoodDefinition, quantity: number): number {
  const quantityPenalty = quantity >= 100 ? 0 : quantity >= 25 ? 20 : 50;
  return food.priority + quantityPenalty - Math.min(quantity, 250) / 10;
}

function buildFarmingAdvisor(herbs: HerbRow[], items: BankItem[]): FarmingAdvisor {
  const quantities = itemQuantities(items);

  return {
    herbs: herbs
      .map((herb) => buildHerbFarmingAdvisorRow(herb))
      .filter((row): row is FarmingAdvisorRow => row !== null)
      .sort((a, b) =>
        a.advisorPriority - b.advisorPriority ||
        b.missingCrop - a.missingCrop ||
        b.seed.quantity - a.seed.quantity ||
        a.name.localeCompare(b.name)
      ),
    flowerPatches: buildCropFarmingAdvisorRows(herbs, FLOWER_CROP_DEFINITIONS, quantities),
    allotments: buildCropFarmingAdvisorRows(herbs, ALLOTMENT_CROP_DEFINITIONS, quantities)
  };
}

function itemQuantities(items: BankItem[]): Map<number, number> {
  const quantities = new Map<number, number>();
  for (const item of items) {
    if (item.id === undefined) {
      continue;
    }
    quantities.set(item.id, (quantities.get(item.id) || 0) + item.quantity);
  }
  return quantities;
}

function buildCropFarmingAdvisorRows(
  herbs: HerbRow[],
  crops: FarmingCropDefinition[],
  quantities: Map<number, number>
): FarmingAdvisorRow[] {
  return crops
    .map((crop) => buildCropFarmingAdvisorRow(crop, herbs, quantities))
    .filter((row): row is FarmingAdvisorRow => row !== null)
    .sort((a, b) =>
      a.advisorPriority - b.advisorPriority ||
      b.missingCrop - a.missingCrop ||
      b.seed.quantity - a.seed.quantity ||
      a.name.localeCompare(b.name)
    );
}

function buildCropFarmingAdvisorRow(
  crop: FarmingCropDefinition,
  herbs: HerbRow[],
  quantities: Map<number, number>
): FarmingAdvisorRow | null {
  const cropStack = farmingCropStack(crop, herbs, quantities);
  const seed = farmingSeedStack(crop, herbs, quantities);
  const potion = bestPotionForSecondary(crop.cropId, herbs);
  const missingCrop = potion ? Math.max(0, potion.missingForTarget - cropStack.quantity) : 0;
  const secondaryShortfalls = potion?.bottlenecks
    .filter((bottleneck) => bottleneck.type === "secondary" && bottleneck.item.id === crop.cropId && bottleneck.shortfallForTarget > 0) || [];

  if (seed.quantity <= 0 && missingCrop <= 0) {
    return null;
  }

  const status = cropFarmingAdvisorStatus(potion, missingCrop, seed.quantity);
  const availablePlantings = Math.floor(seed.quantity / crop.seedsPerPatch);

  return {
    key: crop.key,
    patchType: crop.patchType,
    name: crop.name,
    crop: cropStack,
    seed,
    targetPotion: potion,
    bankedFourDose: potion?.bankedFourDose,
    targetFourDose: potion?.targetFourDose,
    missingForTarget: potion?.missingForTarget || 0,
    missingCrop,
    availableCrop: cropStack.quantity,
    craftable: potion?.craftable || 0,
    secondaryShortfalls,
    status,
    summary: cropFarmingSummary(crop, cropStack, seed, availablePlantings, potion, missingCrop),
    recommendedActions: [cropFarmingAction(crop, seed, missingCrop, potion)],
    levelRequirements: { farming: crop.farmingLevel },
    seedsPerPatch: crop.seedsPerPatch,
    availablePlantings,
    advisorPriority: cropFarmingAdvisorPriority(status, crop, potion, missingCrop, seed.quantity)
  };
}

function buildHerbFarmingAdvisorRow(herb: HerbRow): FarmingAdvisorRow | null {
  const targetPotion = herb.potions
    .filter((potion) => potion.targetFourDose !== undefined)
    .slice()
    .sort((a, b) => a.advisorPriority - b.advisorPriority)[0];

  if (!targetPotion) {
    if (herb.seed.quantity <= 0) {
      return null;
    }

    const status: FarmingAdvisorStatus = "ready";
    return {
      key: herb.key,
      patchType: "herb",
      name: herb.name,
      crop: { ...herb.clean, quantity: herb.availableHerb },
      seed: herb.seed,
      missingForTarget: 0,
      missingCrop: 0,
      availableCrop: herb.availableHerb,
      craftable: 0,
      secondaryShortfalls: [],
      status,
      summary: `${formatNumber(herb.seed.quantity)} seeds banked for herb runs.`,
      recommendedActions: [plantHerbSeedAction(herb, herb.seed.quantity, `${herb.seed.name}s are banked for herb runs.`)],
      levelRequirements: herb.levelRequirements,
      advisorPriority: farmingAdvisorPriority(status, undefined, 0, herb.seed.quantity)
    };
  }

  const secondaryShortfalls = targetPotion.bottlenecks
    .filter((bottleneck) => bottleneck.type === "secondary" && bottleneck.shortfallForTarget > 0);
  const missingCrop = Math.max(0, targetPotion.missingForTarget - herb.availableHerb);
  const status = farmingAdvisorStatus(targetPotion, missingCrop, herb.seed.quantity);

  if (status === "ok" && herb.seed.quantity <= 0) {
    return null;
  }

  return {
    key: herb.key,
    patchType: "herb",
    name: herb.name,
    crop: { ...herb.clean, quantity: herb.availableHerb },
    seed: herb.seed,
    targetPotion,
    bankedFourDose: targetPotion.bankedFourDose,
    targetFourDose: targetPotion.targetFourDose,
    missingForTarget: targetPotion.missingForTarget,
    missingCrop,
    availableCrop: herb.availableHerb,
    craftable: targetPotion.craftable,
    secondaryShortfalls,
    status,
    summary: farmingSummary(herb, targetPotion, missingCrop, secondaryShortfalls),
    recommendedActions: farmingRecommendedActions(herb, targetPotion, missingCrop, status),
    levelRequirements: herb.levelRequirements,
    advisorPriority: farmingAdvisorPriority(status, targetPotion, missingCrop, herb.seed.quantity)
  };
}

function farmingAdvisorStatus(
  potion: PotionBankItem,
  missingCrop: number,
  seedQuantity: number
): FarmingAdvisorStatus {
  if (potion.missingForTarget > 0 && missingCrop > 0) {
    if (seedQuantity <= 0) {
      return "blocked";
    }
    return potion.stockStatus === "critical" ? "critical" : "low";
  }

  if (seedQuantity > 0) {
    return "ready";
  }

  return "ok";
}

function farmingRecommendedActions(
  herb: HerbRow,
  potion: PotionBankItem,
  missingCrop: number,
  status: FarmingAdvisorStatus
): RecommendedAction[] {
  const seedAction = potion.recommendedActions
    .find((action) => action.item?.id === herb.seed.id && (action.type === "plant" || action.type === "source"));

  if (seedAction) {
    return [seedAction];
  }

  if (herb.seed.quantity > 0 && (missingCrop > 0 || status === "ready")) {
    return [plantHerbSeedAction(herb, herb.seed.quantity, `${herb.name} supports ${potion.name} supplies.`)];
  }

  if (missingCrop > 0) {
    return [sourceHerbSeedAction(herb, missingCrop, `${herb.name} is short for ${potion.name} supplies.`)];
  }

  return [];
}

function plantHerbSeedAction(herb: HerbRow, quantity: number, reason: string): RecommendedAction {
  return {
    type: "plant",
    label: `Plant ${herb.seed.name}s`,
    item: herb.seed,
    quantity,
    reason,
    skill: "farming",
    levelRequired: herb.levelRequirements.farming
  };
}

function sourceHerbSeedAction(herb: HerbRow, quantity: number, reason: string): RecommendedAction {
  return {
    type: "source",
    label: `Get ${herb.seed.name}s`,
    item: herb.seed,
    quantity,
    reason,
    skill: "farming",
    levelRequired: herb.levelRequirements.farming
  };
}

function farmingCropStack(crop: FarmingCropDefinition, herbs: HerbRow[], quantities: Map<number, number>): BankItem {
  const secondary = herbs
    .flatMap((herb) => herb.secondaries)
    .find((item) => item.id === crop.cropId);

  return secondary
    ? itemStack(crop.cropId, crop.name, secondary.quantity)
    : itemStack(crop.cropId, crop.name, quantities.get(crop.cropId) || 0);
}

function farmingSeedStack(crop: FarmingCropDefinition, herbs: HerbRow[], quantities: Map<number, number>): BankItem {
  const secondarySeed = herbs
    .flatMap((herb) => herb.secondaries)
    .map((secondary) => secondary.seed)
    .find((seed): seed is BankItem => seed?.id === crop.seedId);
  const seedQuantity = secondarySeed?.quantity || seedQuantityFromRows(crop.seedId, herbs) || quantities.get(crop.seedId) || 0;

  return itemStack(crop.seedId, SEEDS.get(crop.seedId) || `${crop.name} seed`, seedQuantity, {
    farming: crop.farmingLevel
  });
}

function seedQuantityFromRows(seedId: number, herbs: HerbRow[]): number {
  const herbSeed = herbs.find((herb) => herb.seed.id === seedId)?.seed;
  return herbSeed?.quantity || 0;
}

function bestPotionForSecondary(secondaryId: number, herbs: HerbRow[]): PotionBankItem | undefined {
  return herbs
    .flatMap((herb) => herb.potions.filter((potion) => potion.targetFourDose !== undefined)
      .filter((potion) => {
        const indexes = potion.secondaryIndexes || [];
        return indexes.some((index) => herb.secondaries[index]?.id === secondaryId);
      }))
    .sort((a, b) => a.advisorPriority - b.advisorPriority)[0];
}

function cropFarmingAdvisorStatus(
  potion: PotionBankItem | undefined,
  missingCrop: number,
  seedQuantity: number
): FarmingAdvisorStatus {
  if (potion && missingCrop > 0) {
    if (seedQuantity <= 0) {
      return "blocked";
    }
    return potion.stockStatus === "critical" ? "critical" : "low";
  }

  if (seedQuantity > 0) {
    return "ready";
  }

  return "ok";
}

function cropFarmingSummary(
  crop: FarmingCropDefinition,
  cropStack: BankItem,
  seed: BankItem,
  availablePlantings: number,
  potion: PotionBankItem | undefined,
  missingCrop: number
): string {
  const details = [
    `${formatNumber(cropStack.quantity)} ${crop.name.toLowerCase()} banked`,
    `${formatNumber(seed.quantity)} seeds`,
    `${formatNumber(availablePlantings)} full plantings`
  ];

  if (potion && missingCrop > 0) {
    details.push(`${formatNumber(missingCrop)} more for ${potion.name}`);
  } else if (potion) {
    details.push(`supports ${potion.name}`);
  }

  return details.join(", ");
}

function cropFarmingAction(
  crop: FarmingCropDefinition,
  seed: BankItem,
  missingCrop: number,
  potion: PotionBankItem | undefined
): RecommendedAction {
  if (seed.quantity > 0) {
    return {
      type: "plant",
      label: `Plant ${seed.name}s`,
      item: seed,
      quantity: seed.quantity,
      reason: potion
        ? `${crop.name} supports ${potion.name} supplies.`
        : `${seed.name}s are banked for ${crop.patchType} patches.`,
      skill: "farming",
      levelRequired: crop.farmingLevel
    };
  }

  return {
    type: "source",
    label: `Get ${seed.name}s`,
    item: seed,
    quantity: missingCrop,
    reason: potion
      ? `${crop.name} is short for ${potion.name} supplies.`
      : `${crop.name} seeds are not banked.`,
    skill: "farming",
    levelRequired: crop.farmingLevel
  };
}

function cropFarmingAdvisorPriority(
  status: FarmingAdvisorStatus,
  crop: FarmingCropDefinition,
  potion: PotionBankItem | undefined,
  missingCrop: number,
  seedQuantity: number
): number {
  const statusRank: Record<FarmingAdvisorStatus, number> = {
    critical: 0,
    low: 1,
    blocked: 2,
    ready: 3,
    ok: 4
  };
  const targetPriority = potion ? Math.max(0, potion.advisorPriority % 10_000) : 5_000 + crop.priority;
  const relevancePenalty = potion ? 0 : 1_000;
  const seedPenalty = seedQuantity > 0 ? 0 : 3_000;

  return statusRank[status] * 10_000 + targetPriority + relevancePenalty + seedPenalty - Math.min(missingCrop, 500);
}

function farmingSummary(
  herb: HerbRow,
  potion: PotionBankItem,
  missingCrop: number,
  secondaryShortfalls: IngredientBottleneck[]
): string {
  const details = [
    `${formatNumber(herb.availableHerb)} herbs`,
    `${formatNumber(potion.craftable)} craftable ${potion.name}`
  ];

  if (missingCrop > 0) {
    details.push(`${formatNumber(missingCrop)} more herbs for target`);
  } else if (secondaryShortfalls.length) {
    details.push(`waiting on ${secondaryShortfalls.map((shortfall) => shortfall.item.name).join(", ")}`);
  } else if (potion.missingForTarget > 0) {
    details.push("banked herbs cover target");
  } else {
    details.push("target stocked");
  }

  return details.join(", ");
}

function farmingAdvisorPriority(
  status: FarmingAdvisorStatus,
  potion: PotionBankItem | undefined,
  missingCrop: number,
  seedQuantity: number
): number {
  const statusRank: Record<FarmingAdvisorStatus, number> = {
    critical: 0,
    low: 1,
    blocked: 2,
    ready: 3,
    ok: 4
  };
  const targetPriority = potion ? Math.max(0, potion.advisorPriority % 10_000) : 900;
  const seedPenalty = seedQuantity > 0 ? 0 : 3_000;
  const stockedPenalty = potion && potion.missingForTarget <= 0 ? 1_000 : 0;

  return statusRank[status] * 10_000 + targetPriority + seedPenalty + stockedPenalty - Math.min(missingCrop, 500);
}

function buildPvmAdvisor(herbs: HerbRow[], food: FoodAdvisorRow[]): SupplyAdvisorRow[] {
  const potions = herbs.flatMap((herb) => herb.potions);
  const topFood = food[0];
  const foodServings = food.reduce((total, item) => total + item.quantity, 0);

  return PVM_SUPPLY_TARGETS.map((target) => {
    if (target.key === "food") {
      const item = topFood || itemStack(385, "Food", 0);
      return supplyRow({
        key: target.key,
        name: target.name,
        item,
        quantity: foodServings,
        targetQuantity: target.targetQuantity,
        criticalThreshold: target.criticalThreshold,
        priority: target.priority,
        summary: `${formatNumber(foodServings)} servings banked`,
        recommendedActions: foodServings >= target.targetQuantity
          ? []
          : [{
              type: "collect",
              label: "Cook or gather more food",
              item,
              quantity: Math.max(0, target.targetQuantity - foodServings),
              reason: "Slayer and PvM trips burn through food quickly."
            }]
      });
    }

    const matchingPotions = potions.filter((potion) => target.potionNames?.includes(potion.name));
    const quantity = matchingPotions.reduce((total, potion) => total + potion.bankedFourDose.quantity, 0);
    const craftable = matchingPotions.reduce((total, potion) => total + potion.craftable, 0);
    const bestPotion = matchingPotions
      .slice()
      .sort((a, b) => b.bankedFourDose.quantity - a.bankedFourDose.quantity || b.craftable - a.craftable)[0];
    const actions = matchingPotions
      .flatMap((potion) => potion.recommendedActions)
      .filter((action) => action.type === "make" || action.type === "collect" || action.type === "plant")
      .slice(0, 3);

    if (quantity < target.targetQuantity && craftable > 0 && bestPotion && !actions.some((action) => action.type === "make")) {
      actions.unshift({
        type: "make",
        label: `Make ${Math.min(craftable, target.targetQuantity - quantity)}x ${bestPotion.name}`,
        item: itemStack(bestPotion.id || bestPotion.bankedFourDose.id || 0, bestPotion.name, Math.min(craftable, target.targetQuantity - quantity)),
        quantity: Math.min(craftable, target.targetQuantity - quantity),
        reason: "Banked ingredients can cover part of this PvM supply target.",
        skill: "herblore",
        levelRequired: bestPotion.levelRequirements?.herblore
      });
    }

    return supplyRow({
      key: target.key,
      name: target.name,
      item: bestPotion?.bankedFourDose || itemStack(2434, target.name, 0),
      quantity,
      targetQuantity: target.targetQuantity,
      criticalThreshold: target.criticalThreshold,
      priority: target.priority,
      summary: `${formatNumber(quantity)} banked 4-dose, ${formatNumber(craftable)} craftable`,
      recommendedActions: actions
    });
  }).sort((a, b) => a.advisorPriority - b.advisorPriority);
}

function supplyRow(input: {
  key: string;
  name: string;
  item: BankItem;
  quantity: number;
  targetQuantity: number;
  criticalThreshold: number;
  priority: number;
  summary: string;
  recommendedActions: RecommendedAction[];
}): SupplyAdvisorRow {
  const status = supplyStatus(input.quantity, input.targetQuantity, input.criticalThreshold);
  return {
    key: input.key,
    name: input.name,
    item: { ...input.item, quantity: input.quantity },
    quantity: input.quantity,
    targetQuantity: input.targetQuantity,
    criticalThreshold: input.criticalThreshold,
    status,
    summary: input.summary,
    recommendedActions: input.recommendedActions,
    advisorPriority: supplyPriority(status, input.priority, input.targetQuantity - input.quantity)
  };
}

function supplyStatus(quantity: number, targetQuantity: number, criticalThreshold: number): SupplyAdvisorRow["status"] {
  if (quantity <= criticalThreshold) {
    return "critical";
  }
  if (quantity < targetQuantity) {
    return "low";
  }
  return "ok";
}

function supplyPriority(status: SupplyAdvisorRow["status"], priority: number, missing: number): number {
  const statusRank: Record<SupplyAdvisorRow["status"], number> = {
    critical: 0,
    low: 1,
    ok: 2
  };
  return statusRank[status] * 10_000 + priority - Math.min(Math.max(0, missing), 500);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function buildPotionBottlenecks(
  herb: HerbDefinition,
  quantities: Map<number, number>,
  secondaryIndexes: number[],
  availableHerb: number,
  missingForTarget: number
): IngredientBottleneck[] {
  const ingredients = potionIngredients(herb, quantities, secondaryIndexes, availableHerb);
  const minimumQuantity = Math.min(...ingredients.map((ingredient) => ingredient.quantity));

  return ingredients
    .filter((ingredient) => ingredient.quantity === minimumQuantity)
    .map((ingredient) => ({
      type: ingredient.type,
      item: ingredient.item,
      quantity: ingredient.quantity,
      neededForTarget: missingForTarget,
      shortfallForTarget: Math.max(0, missingForTarget - ingredient.quantity)
    }));
}

function potionIngredients(
  herb: HerbDefinition,
  quantities: Map<number, number>,
  secondaryIndexes: number[],
  availableHerb: number
): PotionIngredient[] {
  const ingredients: PotionIngredient[] = [
    {
      type: "herb",
      item: itemStack(herb.cleanId, herb.name, availableHerb),
      quantity: availableHerb
    }
  ];

  for (const secondaryIndex of secondaryIndexes) {
    const secondary = herb.secondaries[secondaryIndex];
    if (!secondary) {
      continue;
    }
    const item = secondaryStack(secondary, quantities);
    ingredients.push({
      type: "secondary",
      item,
      quantity: item.quantity
    });
  }

  return ingredients;
}

function potionStockStatus(bankedFourDoseQuantity: number, craftable: number, target?: PotionTarget): PotionStockStatus {
  if (!target) {
    return craftable > 0 ? "craftable" : "untracked";
  }

  if (bankedFourDoseQuantity <= target.criticalThreshold) {
    return "critical";
  }

  if (bankedFourDoseQuantity < target.targetFourDose) {
    return "low";
  }

  return "ok";
}

function advisorPriority(status: PotionStockStatus, missingForTarget: number, target?: PotionTarget): number {
  const statusRank: Record<PotionStockStatus, number> = {
    critical: 0,
    low: 1,
    craftable: 2,
    ok: 3,
    untracked: 4
  };

  return statusRank[status] * 10_000 + (target?.priority || 900) - Math.min(missingForTarget, 500);
}

function buildRecommendedActions(context: RecommendationContext): RecommendedAction[] {
  const { potion, herb, seed, quantities, secondaryIndexes, craftable, missingForTarget, target } = context;
  const actions: RecommendedAction[] = [];

  if (!target || missingForTarget <= 0) {
    if (craftable > 0 && (!target || target.targetFourDose <= context.bankedFourDoseQuantity)) {
      actions.push({
        type: "make",
        label: `Make ${craftable}x ${potion.name}`,
        item: itemStack(potion.id, potion.name, craftable),
        quantity: craftable,
        reason: "Banked ingredients are ready to make this potion.",
        skill: "herblore",
        levelRequired: potion.herbloreLevel
      });
    }
    return actions;
  }

  if (craftable > 0) {
    const makeQuantity = Math.min(craftable, missingForTarget);
    actions.push({
      type: "make",
      label: `Make ${makeQuantity}x ${potion.name}`,
      item: itemStack(potion.id, potion.name, makeQuantity),
      quantity: makeQuantity,
      reason: "Banked ingredients cover this part of the target.",
      skill: "herblore",
      levelRequired: potion.herbloreLevel
    });
  }

  if (craftable >= missingForTarget) {
    return actions;
  }

  const neededForTarget = missingForTarget;
  const ingredients = potionIngredients(herb, quantities, secondaryIndexes, quantities.get(herb.cleanId) || 0)
    .map((ingredient) =>
      ingredient.type === "herb"
        ? {
            ...ingredient,
            quantity: (quantities.get(herb.cleanId) || 0) + (quantities.get(herb.grimyId) || 0) + (quantities.get(herb.unfinishedPotionId) || 0)
          }
        : ingredient
    )
    .filter((ingredient) => ingredient.quantity < neededForTarget)
    .sort((a, b) => a.quantity - b.quantity);
  const usedLabels = new Set<string>();

  for (const ingredient of ingredients) {
    const action = ingredient.type === "herb"
      ? herbAction(herb, seed, neededForTarget - ingredient.quantity)
      : collectAction(ingredient.item, neededForTarget - ingredient.quantity);

    if (usedLabels.has(action.label)) {
      continue;
    }
    usedLabels.add(action.label);
    actions.push(action);
  }

  return actions;
}

function herbAction(herb: HerbDefinition, seed: BankItem, quantity: number): RecommendedAction {
  if (seed.quantity > 0) {
    return {
      type: "plant",
      label: `Plant ${seed.name}s`,
      item: seed,
      quantity,
      reason: `${herb.name} is short for the target and seeds are banked.`,
      skill: "farming",
      levelRequired: herb.farmingLevel
    };
  }

  return {
    type: "source",
    label: `Get ${seed.name}s`,
    item: seed,
    quantity,
    reason: `${herb.name} is short and no matching seeds are banked.`,
    skill: "farming",
    levelRequired: herb.farmingLevel
  };
}

function collectAction(item: SecondaryBankItem, quantity: number): RecommendedAction {
  if (item.seed?.quantity) {
    return {
      type: "plant",
      label: `Plant ${item.seed.name}s`,
      item: item.seed,
      quantity,
      reason: `${item.name} is short for the target and seeds are banked.`,
      skill: "farming",
      levelRequired: item.seed.levelRequirements?.farming
    };
  }

  return {
    type: "collect",
    label: `Collect ${item.name}`,
    item,
    quantity,
    reason: `${item.name} is short for the target.`
  };
}

function bankedFourDosePotionQuantity(potion: PotionDefinition, quantities: Map<number, number>, items: BankItem[]): number {
  if (potion.doseIds) {
    const doseCount = potion.doseIds.reduce((total, id, index) => total + (quantities.get(id) || 0) * (4 - index), 0);
    return Math.floor(doseCount / 4);
  }

  const baseName = normalizeName(potion.name);
  const doseCount = items.reduce((total, item) => {
    const match = item.name.match(/^(.+?)\((1|2|3|4)\)$/);

    if (!match || normalizeName(match[1]) !== baseName) {
      return total;
    }

    return total + item.quantity * Number(match[2]);
  }, 0);

  if (doseCount) {
    return Math.floor(doseCount / 4);
  }

  return quantities.get(potion.id) || 0;
}

function craftablePotionQuantity(herbQuantity: number, secondaries: SecondaryDefinition[], quantities: Map<number, number>, secondaryIndexes: number[]): number {
  const ingredientQuantities = secondaryIndexes
    .map((index) => secondaries[index])
    .filter((secondary): secondary is SecondaryDefinition => secondary !== undefined)
    .map((secondary) => quantities.get(secondary.id) || 0);

  return Math.min(herbQuantity, ...ingredientQuantities);
}

function itemStack(id: number, name: string, quantity: number, levelRequirements?: LevelRequirements): BankItem {
  return {
    id,
    name,
    quantity,
    iconUrl: itemIconUrl(id),
    levelRequirements
  };
}

function secondaryStack(secondary: SecondaryDefinition, quantities: Map<number, number>): SecondaryBankItem {
  return {
    ...itemStack(secondary.id, secondary.name, quantities.get(secondary.id) || 0),
    seed: secondary.seedId
      ? itemStack(secondary.seedId, SEEDS.get(secondary.seedId) || `${secondary.name} seed`, quantities.get(secondary.seedId) || 0, {
          farming: secondary.farmingLevel
        })
      : undefined
  };
}

function mergeAndSort(items: BankItem[], names: Map<number, string>): BankItem[] {
  const merged = new Map<string, BankItem>();

  for (const item of items) {
    const key = item.id === undefined ? normalizeName(item.name) : String(item.id);
    const displayName = item.id === undefined ? item.name : names.get(item.id) || item.name;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.set(key, {
        id: item.id,
        name: displayName,
        quantity: item.quantity,
        iconUrl: item.id === undefined ? undefined : itemIconUrl(item.id)
      });
    }
  }

  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function itemIconUrl(id: number): string {
  return `https://static.runelite.net/cache/item/icon/${id}.png`;
}

function firstDefined(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined && value !== null);
}

function numberFrom(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    return Number(value);
  }
  return Number.NaN;
}

function stringFrom(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
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
