/* 
 * Interactive translation editor for src/locales/<lang>/common.json
 * Master language: en
 */

const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer");

// Use a prompt instance – works well with inquirer v8
const prompt = inquirer.createPromptModule();

const LOCALES_DIR = path.join(__dirname, "..", "src", "locales");
const MASTER_LANG = "en";
const FILE_NAME = "common.json";

function loadJson(lang) {
  const filePath = path.join(LOCALES_DIR, lang, FILE_NAME);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function saveJson(lang, obj) {
  const dir = path.join(LOCALES_DIR, lang);
  const filePath = path.join(dir, FILE_NAME);
  const content = JSON.stringify(obj, null, 2);
  fs.writeFileSync(filePath, content + "\n", "utf-8");
  console.log(`✅ Saved ${filePath}`);
}

function flatten(obj, prefix = "") {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(acc, flatten(value, fullKey));
    } else {
      acc[fullKey] = value;
    }
    return acc;
  }, {});
}

function unflatten(flat) {
  const result = {};
  for (const [fullKey, value] of Object.entries(flat)) {
    const parts = fullKey.split(".");
    let cursor = result;
    parts.forEach((part, idx) => {
      if (idx === parts.length - 1) {
        cursor[part] = value;
      } else {
        if (!cursor[part] || typeof cursor[part] !== "object") {
          cursor[part] = {};
        }
        cursor = cursor[part];
      }
    });
  }
  return result;
}

async function main() {
  // 1) Discover languages
  const languages = fs
    .readdirSync(LOCALES_DIR)
    .filter((entry) =>
      fs.statSync(path.join(LOCALES_DIR, entry)).isDirectory()
    );

  if (!languages.includes(MASTER_LANG)) {
    console.error(
      `Master language "${MASTER_LANG}" not found in ${LOCALES_DIR}`
    );
    process.exit(1);
  }

  const masterRaw = loadJson(MASTER_LANG);
  const masterFlat = flatten(masterRaw);
  const masterKeys = Object.keys(masterFlat);

  const otherLangs = languages.filter((lng) => lng !== MASTER_LANG);

  if (otherLangs.length === 0) {
    console.log("No other languages found besides master.");
    process.exit(0);
  }

  // 2) Choose which languages to edit
  const { langsToEdit } = await prompt([
    {
      type: "checkbox",
      name: "langsToEdit",
      message: "Which languages do you want to edit?",
      choices: otherLangs.map((lng) => ({
        name: lng.toUpperCase(),
        value: lng,
        checked: true,
      })),
    },
  ]);

  if (langsToEdit.length === 0) {
    console.log("Nothing selected. Exiting.");
    process.exit(0);
  }

  // 3) For each selected language, interactively edit all keys
  for (const lang of langsToEdit) {
    console.log("\n======================================");
    console.log(`Editing language: ${lang.toUpperCase()}`);
    console.log("======================================\n");

    const langRaw = loadJson(lang);
    const langFlat = flatten(langRaw);

    let skipRestForLang = false;

    for (const key of masterKeys) {
      if (skipRestForLang) break;

      const enValue = masterFlat[key];
      const currentValue = langFlat[key] ?? "";

      console.log(`\nKey: ${key}`);
      console.log(`EN: ${enValue}`);
      console.log(`Current ${lang.toUpperCase()}: ${currentValue || "(empty)"}`);

      const answer = await prompt([
        {
          type: "input",
          name: "value",
          message:
            "Enter new translation (Enter = keep, '.' = clear, 's' = skip rest for this language):",
        },
      ]);

      const input = answer.value.trim();

      if (input === "") {
        // keep existing
        continue;
      }

      if (input === "s" || input === "S") {
        console.log(`⏭ Skipping remaining keys for ${lang.toUpperCase()}`);
        skipRestForLang = true;
        break;
      }

      if (input === ".") {
        langFlat[key] = "";
      } else {
        langFlat[key] = input;
      }
    }

    const updated = unflatten(langFlat);
    // sort keys in same order as master (shallow, but good enough)
    const sorted = {};
    for (const key of Object.keys(masterRaw)) {
      if (Object.prototype.hasOwnProperty.call(updated, key)) {
        sorted[key] = updated[key];
      }
    }
    // also keep any additional top-level keys
    for (const [k, v] of Object.entries(updated)) {
      if (!Object.prototype.hasOwnProperty.call(sorted, k)) {
        sorted[k] = v;
      }
    }

    saveJson(lang, sorted);
  }

  console.log("\n🎉 Translation editing finished.");
}

main().catch((err) => {
  console.error("Error in translation editor:", err);
  process.exit(1);
});
