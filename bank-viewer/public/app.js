const refreshButton = document.querySelector("#refresh");
const herbsEl = document.querySelector("#herbs");
const advisorEl = document.querySelector("#advisor");
const tabButtons = [...document.querySelectorAll("[data-tab]")];
const tabPanels = [...document.querySelectorAll("[data-tab-panel]")];

const FEATURED_SKILLS = ["hitpoints", "herblore", "farming", "cooking"];

let activeTab = "herbs";
let activeAdvisorModule = "activities";
let bankPayload = null;
let statsState = {
  loading: false,
  data: null,
  error: ""
};

function formatQuantity(value) {
  return new Intl.NumberFormat().format(value);
}

function createIcon(item) {
  const iconWrap = document.createElement("span");
  iconWrap.className = "item-icon-wrap";

  if (item.iconUrl) {
    const icon = document.createElement("img");
    icon.className = "item-icon";
    icon.src = item.iconUrl;
    icon.alt = "";
    icon.loading = "lazy";
    icon.decoding = "async";
    icon.addEventListener("error", () => {
      icon.remove();
      iconWrap.classList.add("missing");
    });
    iconWrap.append(icon);
  } else {
    iconWrap.classList.add("missing");
  }

  return iconWrap;
}

function setActiveTab(tab) {
  activeTab = tab;

  for (const button of tabButtons) {
    const isActive = button.dataset.tab === tab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  }

  for (const panel of tabPanels) {
    const isActive = panel.dataset.tabPanel === tab;
    panel.hidden = !isActive;
    panel.classList.toggle("is-hidden", !isActive);
  }

  renderActiveTab();

  if (tab === "advisor") {
    loadStatsForCurrentPlayer();
  }
}

function renderActiveTab() {
  if (activeTab === "advisor") {
    renderAdvisor(advisorEl, bankPayload);
    return;
  }

  renderHerbTable(herbsEl, bankPayload?.herbs || []);
}

function renderHerbTable(container, herbs) {
  container.replaceChildren();

  if (!herbs.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = bankPayload ? "No matching items found." : "Loading bank items...";
    container.append(empty);
    return;
  }

  const sections = document.createElement("div");
  sections.className = "herb-sections";

  for (const herb of herbs) {
    sections.append(createHerbSection(herb));
  }

  container.append(sections);
}

function createHerbSection(herb) {
  const section = document.createElement("section");
  section.className = "herb-section";
  section.classList.toggle("is-empty", herb.total === 0);

  const herbSlot = createItemStack(herb.clean, herb.total, herb.name);
  herbSlot.classList.add("herb-stack");

  const recipes = document.createElement("div");
  recipes.className = "recipe-grid";
  recipes.setAttribute("role", "list");

  const recipeRows = buildHerbRecipeRows(herb);

  for (const [recipeIndex, recipe] of recipeRows.entries()) {
    let usedSlots = 0;

    if (recipeIndex === 0) {
      recipes.append(herbSlot);
    } else {
      recipes.append(createSpacer());
    }
    usedSlots += 1;

    for (const secondary of recipe.secondaries) {
      const itemStack = createItemStack(secondary.item, secondary.quantity, secondary.tooltip);
      itemStack.setAttribute("role", "listitem");
      recipes.append(itemStack);
      usedSlots += 1;
    }

    while (usedSlots < 4) {
      recipes.append(createSpacer());
      usedSlots += 1;
    }

    if (recipe.potion) {
      const itemStack = createItemStack(recipe.potion.item, recipe.potion.quantity, recipe.potion.tooltip);
      itemStack.setAttribute("role", "listitem");
      recipes.append(itemStack);
      usedSlots += 1;
    }

    while (usedSlots < 6) {
      recipes.append(createSpacer());
      usedSlots += 1;
    }

    if (recipe.bankedPotion) {
      const itemStack = createItemStack(recipe.bankedPotion.item, recipe.bankedPotion.quantity, recipe.bankedPotion.tooltip);
      itemStack.setAttribute("role", "listitem");
      recipes.append(itemStack);
      usedSlots += 1;
    }

    while (usedSlots < 7) {
      recipes.append(createSpacer());
      usedSlots += 1;
    }

    if (recipe.herbSeed) {
      const itemStack = createItemStack(recipe.herbSeed.item, recipe.herbSeed.quantity, recipe.herbSeed.tooltip);
      itemStack.setAttribute("role", "listitem");
      recipes.append(itemStack);
      usedSlots += 1;
    }

    if (recipe.secondarySeed) {
      const itemStack = createItemStack(recipe.secondarySeed.item, recipe.secondarySeed.quantity, recipe.secondarySeed.tooltip);
      itemStack.setAttribute("role", "listitem");
      recipes.append(itemStack);
      usedSlots += 1;
    }

    while (usedSlots < 9) {
      recipes.append(createSpacer());
      usedSlots += 1;
    }
  }

  section.append(recipes);
  return section;
}

function createSpacer() {
  const spacer = document.createElement("span");
  spacer.className = "bank-slot-spacer";
  spacer.setAttribute("aria-hidden", "true");
  return spacer;
}

function buildHerbRecipeRows(herb) {
  const recipeRows = herb.potions.length
    ? herb.potions.map((potion, index) => ({
        potion,
        secondaries: (potion.secondaryIndexes || [index])
          .map((secondaryIndex) => herb.secondaries[secondaryIndex])
          .filter(Boolean)
      }))
    : herb.secondaries.map((secondary) => ({ potion: null, secondaries: [secondary] }));

  return recipeRows.map((recipeRow) => {
    const secondarySeed = recipeRow.secondaries.find((secondary) => secondary.seed)?.seed;

    return {
      secondaries: recipeRow.secondaries.map((secondary) => ({ item: secondary })),
      potion: recipeRow.potion ? { item: recipeRow.potion } : null,
      bankedPotion: recipeRow.potion?.bankedFourDose
        ? { item: recipeRow.potion.bankedFourDose, tooltip: `${recipeRow.potion.name} banked 4-dose equivalent` }
        : null,
      herbSeed: herb.seed ? { item: herb.seed, tooltip: `${herb.seed.name} banked` } : null,
      secondarySeed: secondarySeed ? { item: secondarySeed, tooltip: `${secondarySeed.name} banked` } : null
    };
  });
}

function createItemStack(item, quantity = item.quantity, tooltip = item.name) {
  const stack = document.createElement("span");
  stack.className = "item-stack";
  stack.classList.toggle("is-empty", quantity === 0);
  stack.tabIndex = 0;
  stack.setAttribute("aria-label", tooltip);

  const count = document.createElement("span");
  count.className = "item-stack-count";
  count.textContent = formatQuantity(quantity);

  const name = document.createElement("span");
  name.className = "item-stack-name";
  name.textContent = item.name;

  stack.append(createIcon(item), count, name);
  return stack;
}

function renderAdvisor(container, payload) {
  container.replaceChildren();

  if (!payload) {
    container.append(createMessage("Loading bank items..."));
    return;
  }

  const layout = document.createElement("div");
  layout.className = "advisor-layout";

  if (statsState.loading || statsState.data) {
    layout.append(createAdvisorProfile());
  }
  layout.append(createAdvisorModules(payload.advisor?.modules || []));
  layout.append(createActiveAdvisorModule(payload));

  container.append(layout);
}

function createActiveAdvisorModule(payload) {
  if (activeAdvisorModule === "potions") {
    return createPotionAdvisor(payload.herbs || []);
  }

  if (activeAdvisorModule === "farming") {
    return createFarmingAdvisor(payload.advisor?.farming);
  }

  if (activeAdvisorModule === "food") {
    return createFoodAdvisor(payload.advisor?.food || []);
  }

  if (activeAdvisorModule === "activities") {
    return createPvmAdvisor(payload.advisor?.pvm || []);
  }

  const section = document.createElement("section");
  section.className = "advisor-section";
  section.append(createMessage("This advisor module is not available yet."));
  return section;
}

function createAdvisorProfile() {
  const profile = document.createElement("section");
  profile.className = "advisor-profile";

  profile.append(createStatsSummary());
  return profile;
}

function createStatsSummary() {
  const summary = document.createElement("div");
  summary.className = "advisor-stats";

  if (statsState.loading) {
    summary.append(createMessage("Loading stats..."));
    return summary;
  }

  if (statsState.error) {
    summary.append(createMessage(statsState.error, true));
    return summary;
  }

  if (!statsState.data) {
    summary.append(createMessage("Stats locked to configured player."));
    return summary;
  }

  for (const skill of FEATURED_SKILLS) {
    const stat = statsState.data.skills?.[skill];
    if (!stat) {
      continue;
    }
    const chip = document.createElement("span");
    chip.className = "stat-chip";
    chip.textContent = `${titleCase(skill)} ${stat.level}`;
    summary.append(chip);
  }

  return summary;
}

function createAdvisorModules(modules) {
  const strip = document.createElement("div");
  strip.className = "advisor-modules";

  const moduleList = modules.length
    ? modules
    : [
        { key: "potions", name: "Potion bottlenecks", status: "active" },
        { key: "farming", name: "Farming", status: "active" },
        { key: "food", name: "Food", status: "placeholder" },
        { key: "runes", name: "Runes", status: "placeholder" },
        { key: "activities", name: "Activities", status: "placeholder" }
      ];

  for (const module of moduleList) {
    const chip = document.createElement("button");
    chip.className = `module-chip is-${module.status}`;
    chip.type = "button";
    chip.textContent = module.name;
    chip.disabled = module.status !== "active";
    chip.classList.toggle("is-selected", module.key === activeAdvisorModule);
    chip.setAttribute("aria-pressed", String(module.key === activeAdvisorModule));
    chip.addEventListener("click", () => {
      if (module.status !== "active") {
        return;
      }
      activeAdvisorModule = module.key;
      renderActiveTab();
    });
    strip.append(chip);
  }

  return strip;
}

function createPotionAdvisor(herbs) {
  const section = document.createElement("section");
  section.className = "advisor-section";

  const rows = advisorPotionRows(herbs);
  if (!rows.length) {
    section.append(createMessage("No potion bottlenecks available."));
    return section;
  }

  for (const row of rows) {
    section.append(createPotionAdvisorRow(row.herb, row.potion, row.actions));
  }

  return section;
}

function createFarmingAdvisor(farming) {
  const section = document.createElement("section");
  section.className = "advisor-section farming-advisor";

  const herbRows = (farming?.herbs || [])
    .filter((row) => hasLevel("farming", row.levelRequirements?.farming))
    .slice(0, 10);
  const flowerRows = (farming?.flowerPatches || [])
    .filter((row) => hasLevel("farming", row.levelRequirements?.farming));
  const allotmentRows = (farming?.allotments || [])
    .filter((row) => hasLevel("farming", row.levelRequirements?.farming));

  section.append(createFarmingPatchGroup("Herb patch", herbRows, createFarmingAdvisorRow, "No herb seed priorities available."));
  section.append(createFarmingPatchGroup("Flower patch", flowerRows, createFarmingAdvisorRow, "No limpwurt seeds or limpwurt-root shortages found."));
  section.append(createFarmingPatchGroup("Allotments", allotmentRows, createFarmingAdvisorRow, "No allotment seeds banked."));

  return section;
}

function createFarmingPatchGroup(titleText, rows, rowRenderer, emptyText) {
  const group = document.createElement("div");
  group.className = "farming-patch-group";

  const header = document.createElement("div");
  header.className = "advisor-section-header";

  const title = document.createElement("h3");
  title.textContent = titleText;

  const urgent = rows.filter((row) => row.status === "critical" || row.status === "low").length;
  const blocked = rows.filter((row) => row.status === "blocked").length;
  const summary = document.createElement("span");
  summary.className = `status-pill ${urgent ? "is-low" : blocked ? "is-blocked" : "is-ready"}`;
  summary.textContent = rows.length ? (urgent ? `${urgent} to plant` : blocked ? `${blocked} blocked` : `${rows.length} ready`) : "Open";

  header.append(title, summary);
  group.append(header);

  if (!rows.length) {
    group.append(createMessage(emptyText));
    return group;
  }

  for (const row of rows) {
    group.append(rowRenderer(row));
  }

  return group;
}

function createFarmingAdvisorRow(priority) {
  const row = document.createElement("article");
  row.className = `advisor-row farming-row is-${priority.status}`;

  const seed = createMiniItem(priority.seed, priority.seed.quantity);
  seed.classList.add("advisor-row-item");

  const body = document.createElement("div");
  body.className = "advisor-row-body";

  const heading = document.createElement("div");
  heading.className = "advisor-row-heading";

  const title = document.createElement("h3");
  title.textContent = priority.seed.name;

  const status = document.createElement("span");
  status.className = `status-pill is-${priority.status}`;
  status.textContent = farmingStatusText(priority);

  heading.append(title, status);

  const line = document.createElement("p");
  line.className = "bottleneck-line";
  line.textContent = priority.summary;

  body.append(
    heading,
    line,
    createActionList((priority.recommendedActions || []).filter((action) => hasLevel(action.skill, action.levelRequired)))
  );
  row.append(seed, body);
  return row;
}

function farmingStatusText(priority) {
  if (priority.targetFourDose && priority.bankedFourDose) {
    return `${titleCase(priority.status)} ${formatQuantity(priority.bankedFourDose.quantity)} / ${formatQuantity(priority.targetFourDose)}`;
  }

  if (priority.status === "ready") {
    return `Ready ${formatQuantity(priority.seed.quantity)}`;
  }

  return titleCase(priority.status);
}

function createFoodAdvisor(foodRows) {
  const section = document.createElement("section");
  section.className = "advisor-section food-advisor";

  const rows = foodRows
    .filter((food) => {
      if (!statsState.data) {
        return true;
      }
      return hasLevel("hitpoints", food.heal) && hasLevel("cooking", food.levelRequirements?.cooking);
    })
    .slice(0, 8);

  if (!rows.length) {
    section.append(createMessage("No useful food found in the bank."));
    return section;
  }

  const header = document.createElement("div");
  header.className = "advisor-section-header";

  const title = document.createElement("h3");
  title.textContent = "Food";

  const totalServings = rows.reduce((total, food) => total + food.quantity, 0);
  const summary = document.createElement("span");
  summary.className = "status-pill";
  summary.textContent = `${formatQuantity(totalServings)} servings`;

  header.append(title, summary);
  section.append(header);

  const grid = document.createElement("div");
  grid.className = "food-grid";
  for (const food of rows) {
    grid.append(createFoodAdvisorCard(food));
  }

  section.append(grid);
  return section;
}

function createFoodAdvisorCard(food) {
  const card = document.createElement("article");
  card.className = `food-card is-${food.category}`;

  const item = createMiniItem(food, food.quantity);
  item.classList.add("food-card-item");

  const body = document.createElement("div");
  body.className = "food-card-body";

  const name = document.createElement("h4");
  name.textContent = food.name;

  const details = document.createElement("p");
  details.textContent = `${formatQuantity(food.quantity)} banked - heals ${formatQuantity(food.heal)} each`;

  body.append(name, details);
  card.append(item, body);
  return card;
}

function createPvmAdvisor(rows) {
  const section = document.createElement("section");
  section.className = "advisor-section pvm-advisor";

  if (!rows.length) {
    section.append(createMessage("No Slayer/PvM supply data available."));
    return section;
  }

  const header = document.createElement("div");
  header.className = "advisor-section-header";

  const title = document.createElement("h3");
  title.textContent = "Slayer/PvM";

  const urgent = rows.filter((row) => row.status === "critical" || row.status === "low").length;
  const summary = document.createElement("span");
  summary.className = `status-pill ${urgent ? "is-low" : "is-ok"}`;
  summary.textContent = urgent ? `${urgent} to fix` : "Ready";

  header.append(title, summary);
  section.append(header);

  for (const row of rows) {
    section.append(createSupplyAdvisorRow(row));
  }

  return section;
}

function createSupplyAdvisorRow(supply) {
  const row = document.createElement("article");
  row.className = `advisor-row is-${supply.status}`;

  const item = createMiniItem(supply.item, supply.quantity);
  item.classList.add("advisor-row-item");

  const body = document.createElement("div");
  body.className = "advisor-row-body";

  const heading = document.createElement("div");
  heading.className = "advisor-row-heading";

  const title = document.createElement("h3");
  title.textContent = supply.name;

  const status = document.createElement("span");
  status.className = `status-pill is-${supply.status}`;
  status.textContent = `${titleCase(supply.status)} ${formatQuantity(supply.quantity)} / ${formatQuantity(supply.targetQuantity)}`;

  heading.append(title, status);

  const line = document.createElement("p");
  line.className = "bottleneck-line";
  line.textContent = supply.summary;

  body.append(heading, line, createActionList((supply.recommendedActions || []).filter((action) => hasLevel(action.skill, action.levelRequired))));
  row.append(item, body);
  return row;
}

function advisorPotionRows(herbs) {
  return herbs
    .flatMap((herb) => (herb.potions || []).map((potion) => ({ herb, potion })))
    .filter(({ potion }) => hasLevel("herblore", potion.levelRequirements?.herblore))
    .map(({ herb, potion }) => ({
      herb,
      potion,
      actions: (potion.recommendedActions || []).filter((action) => hasLevel(action.skill, action.levelRequired))
    }))
    .filter(({ potion, actions }) => potion.targetFourDose || potion.stockStatus === "critical" || potion.stockStatus === "low" || potion.craftable > 0 || actions.length)
    .filter(({ potion, actions }) => potion.stockStatus !== "ok" || actions.length)
    .sort((a, b) => (a.potion.advisorPriority || 99999) - (b.potion.advisorPriority || 99999));
}

function createPotionAdvisorRow(herb, potion, actions) {
  const row = document.createElement("article");
  row.className = `advisor-row is-${potion.stockStatus}`;

  const banked = createMiniItem(potion.bankedFourDose, potion.bankedFourDose.quantity);
  banked.classList.add("advisor-row-item");

  const body = document.createElement("div");
  body.className = "advisor-row-body";

  const heading = document.createElement("div");
  heading.className = "advisor-row-heading";

  const title = document.createElement("h3");
  title.textContent = potion.name;

  const status = document.createElement("span");
  status.className = `status-pill is-${potion.stockStatus}`;
  status.textContent = statusText(potion);

  heading.append(title, status);
  body.append(heading);
  body.append(createBottleneckLine(herb, potion));
  body.append(createActionList(actions || []));

  row.append(banked, body);
  return row;
}

function createMiniItem(item, quantity = item.quantity) {
  const stack = document.createElement("span");
  stack.className = "mini-item";
  stack.append(createIcon(item));

  const count = document.createElement("span");
  count.className = "mini-item-count";
  count.textContent = formatQuantity(quantity);

  stack.append(count);
  return stack;
}

function createBottleneckLine(herb, potion) {
  const line = document.createElement("p");
  line.className = "bottleneck-line";

  const bottlenecks = potion.bottlenecks || [];
  if (!bottlenecks.length) {
    line.textContent = `Herb: ${herb.name}`;
    return line;
  }

  const names = bottlenecks.map((bottleneck) => `${bottleneck.item.name} (${formatQuantity(bottleneck.quantity)})`);
  line.textContent = `Bottleneck: ${names.join(", ")}`;
  return line;
}

function createActionList(actions) {
  const list = document.createElement("div");
  list.className = "action-list";

  if (!actions.length) {
    const empty = document.createElement("span");
    empty.className = "action-chip is-muted";
    empty.textContent = "No action";
    list.append(empty);
    return list;
  }

  for (const action of actions) {
    const chip = document.createElement("span");
    chip.className = `action-chip is-${action.type}`;
    if (action.item) {
      chip.append(createIcon(action.item));
    }

    const label = document.createElement("span");
    label.textContent = action.label;
    chip.title = action.reason;
    chip.append(label);
    list.append(chip);
  }

  return list;
}

function statusText(potion) {
  const target = potion.targetFourDose;
  if (!target) {
    return titleCase(potion.stockStatus);
  }

  return `${titleCase(potion.stockStatus)} ${formatQuantity(potion.bankedFourDose.quantity)} / ${formatQuantity(target)}`;
}

async function loadBank() {
  refreshButton.disabled = true;

  if (activeTab === "advisor") {
    advisorEl.replaceChildren(createMessage("Loading bank items..."));
  } else {
    herbsEl.replaceChildren(createMessage("Loading bank items..."));
  }

  try {
    const response = await fetch("/api/bank", {
      headers: { accept: "application/json" }
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Unable to load bank data.");
    }

    bankPayload = payload;
    renderActiveTab();
  } catch (error) {
    const message = createMessage(error instanceof Error ? error.message : "Unable to load bank data.", true);
    if (activeTab === "advisor") {
      advisorEl.replaceChildren(message);
    } else {
      herbsEl.replaceChildren(message);
    }
  } finally {
    refreshButton.disabled = false;
  }
}

function loadStatsForCurrentPlayer() {
  if (statsState.loading || statsState.data) {
    return;
  }

  loadStatsForPlayer();
}

async function loadStatsForPlayer() {
  statsState = {
    loading: true,
    data: null,
    error: ""
  };
  renderActiveTab();

  try {
    const response = await fetch("/api/stats", {
      headers: { accept: "application/json" }
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Unable to load stats.");
    }

    statsState = {
      loading: false,
      data: payload,
      error: ""
    };
  } catch (error) {
    statsState = {
      loading: false,
      data: null,
      error: error instanceof Error ? error.message : "Unable to load stats."
    };
  }

  renderActiveTab();
}

function createMessage(message, isError = false) {
  const element = document.createElement("p");
  element.className = isError ? "empty error" : "empty";
  element.textContent = message;
  return element;
}

function hasLevel(skill, levelRequired) {
  if (!skill || !levelRequired) {
    return true;
  }

  if (!statsState.data) {
    return true;
  }

  const level = statsState.data?.skills?.[skill]?.level || 0;
  return level >= levelRequired;
}

function titleCase(value) {
  return value.replace(/(^|\s)\w/g, (letter) => letter.toUpperCase());
}

for (const button of tabButtons) {
  button.addEventListener("click", () => {
    setActiveTab(button.dataset.tab || "herbs");
  });
}

refreshButton.addEventListener("click", loadBank);
setActiveTab(activeTab);
loadBank();
