#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const HYDRA_DIR = path.join(
  process.env.USERPROFILE || process.env.HOME,
  ".runelite",
  "hydraprofiles"
);

const DRY_RUN = process.argv.includes("--dry-run");

// property prefix -> expected key
const TOKENS = {
  // xKylee
  AutoContinue: "OBYBU-PSBPL-LLPFW-JQOKI",
  autoeat: "NMDRB-BUHWQ-BTZQO-ZZFBJ",
  autoPot: "EDOQX-UWWQV-RJESN-XRBLP",
  automonsterkiller: "OHGDG-CMURN-NJYAY-UZEDQ",
  AutoTeleHopLog: "EHLZE-LBGHM-FUUOW-ZFCWA",
  autoGauntlet: "CLBIR-ABWAP-XOQYT-VAVXY",
  autozulrah: "LJEAA-ETASU-OMIJN-CITSS",
  autobandosprayers: "PKRGM-QPYSU-XIRDN-MDFTE",
  autodagannothkingprayers: "MNMJP-QYHSO-FMAQJ-ABMXX",
  AutoInfernalPrayers: "FFCCC-NRXXL-DMVPM-EBCRG",
  autofightcaveprayers: "QEDHI-DPFUN-HGWQJ-GEZXH",
  autocolosseumprayers: "JDQHC-RPMQZ-BISOS-DXFHD",
  autocalvarionprayers: "YJKRI-WLYGX-VHDYG-LFLQL",
  autospindelprayers: "AMNEB-UZJON-ZHZXN-WFCSL",
  autoartioprayers: "VFFLD-EFSWQ-VSCPF-NXATJ",
  tearsofguthix: "OVTRS-UPWQQ-ZZLHQ-EQHCB",

  // Squire
  hydraEssentials: "FQOCD-AJZBS-IHXVA-HFVGL",
  AutoTemporossConfig: "NMFXM-UZLBG-VJZXM-ANUCG",
  AutoLMSConfig: "QNOCW-NKUTU-OFLIZ-TMYFF",
  AutoPlankMakerConfig: "JPBGO-SWZXR-UJJPG-UFGLI",
  JustClickAgilityConfig: "TPFNB-FYQNK-TUYUS-FYBCH",
  JustClickBlastFurnaceConfig: "DSCWB-UZPST-WDQWA-DZZPN",
  NoCapQuestHelperConfig: "EFIDH-HDVWC-YQPBX-APEMZ",

  // Owain
  hydrabirdhouse: "JNVQP-OHXJM-YBYNT-FIJCX",
  hydrafarmrun: "ECBSQ-IRFFX-TVJRD-VJQQR",
  hydratreerun: "FZUBV-ZUTDM-WMLXN-GVHBH",
  hydramahoganyhomes: "UGYCY-ENFQH-JXXFT-JTQED",
  hydraactionbar: "VXYLD-HMCUT-SFTHB-ILQSC",
  hydrasolowintertodt: "PXYZJ-XWKHU-UCDNZ-NYTZM",
  hydragiantsfoundry: "QFOPZ-ERRVB-YYUHY-FIFWG",
  hydramta: "AXCTS-YOAVE-OGNLL-BCFDJ",
  hydraherbiboar: "DVFKA-TOZIL-YBAIO-NQDBH",
  hydrahuntersrumours: "ZZYYG-TNERS-RNKLQ-KDBBQ",
  hydrafarmingcontracts: "IKKLP-QPCTK-DMKAP-KBGIY",
  hydratotemfletching: "OEMYW-BHTMX-VFHED-OSEJR",
  hydrainventoryoverload: "JQJFJ-XTRLO-QZJTQ-RLXDF",
  hydrarealtaxi: "RIFHF-LYOSL-ZMMPB-IPQMY",
  seaweedcheat: "NLUIF-CSIBB-IZXEA-QFBAP",
  hydraamethyst: "WECCX-JWCLE-KJLBZ-ZWUQS",
  phantommuspahprayers: "GQENE-ZWDWW-NVJAL-FQWBS",
  streamermode: "PWKNO-OLWJL-JWYBR-TLCAM",
};

const MIKE_AUTH_KEY = "C20E9ED69205E24E58E6";
const HIMON_API_KEY = "76idzcceuc5";

const files = fs
  .readdirSync(HYDRA_DIR)
  .filter((f) => f.endsWith(".properties") && !f.startsWith("._"));

let totalFixed = 0;
let totalAdded = 0;

for (const file of files) {
  const filePath = path.join(HYDRA_DIR, file);
  const raw = fs.readFileSync(filePath, "utf-8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(eol);
  const changes = [];

  const tokenLines = new Map();
  const authKeyLines = new Map();
  let himonLine = -1;

  for (let i = 0; i < lines.length; i++) {
    let m;
    if ((m = lines[i].match(/^([A-Za-z][A-Za-z0-9_]*)\.token=(.*)$/))) {
      tokenLines.set(m[1], i);
    } else if ((m = lines[i].match(/^(\w+)\.authKey=(.*)$/))) {
      authKeyLines.set(m[1], i);
    } else if (lines[i].match(/^himonapikey\.apikey=/)) {
      himonLine = i;
    }
  }

  for (const [prop, key] of Object.entries(TOKENS)) {
    const expected = `${prop}.token=${key}`;
    if (tokenLines.has(prop)) {
      const idx = tokenLines.get(prop);
      if (lines[idx] !== expected) {
        lines[idx] = expected;
        changes.push(`  FIXED  ${prop}.token`);
        totalFixed++;
      }
    } else {
      lines.push(expected);
      changes.push(`  ADDED  ${prop}.token`);
      totalAdded++;
    }
  }

  for (const [plug, idx] of authKeyLines) {
    const expected = `${plug}.authKey=${MIKE_AUTH_KEY}`;
    if (lines[idx] !== expected) {
      lines[idx] = expected;
      changes.push(`  FIXED  ${plug}.authKey`);
      totalFixed++;
    }
  }

  const expectedHimon = `himonapikey.apikey=${HIMON_API_KEY}`;
  if (himonLine >= 0) {
    if (lines[himonLine] !== expectedHimon) {
      lines[himonLine] = expectedHimon;
      changes.push("  FIXED  himonapikey.apikey");
      totalFixed++;
    }
  } else {
    lines.push(expectedHimon);
    changes.push("  ADDED  himonapikey.apikey");
    totalAdded++;
  }

  if (changes.length) {
    console.log(`\n${file}:`);
    changes.forEach((c) => console.log(c));
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, lines.join(eol));
    }
  } else {
    console.log(`${file}: OK`);
  }
}

console.log("\n--- Summary ---");
console.log(`Profiles scanned: ${files.length}`);
console.log(`Keys fixed:       ${totalFixed}`);
console.log(`Keys added:       ${totalAdded}`);
if (DRY_RUN) console.log("(dry run - no files were modified)");
