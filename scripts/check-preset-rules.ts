import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

/**
 * Every rule a preset names must exist in the oxlint that will run it.
 *
 * Oxlint used to ignore a rule it could not resolve, so a preset could name a
 * rule that never existed and still load. Newer oxlint refuses the whole
 * configuration instead, which means one stale name makes every preset that
 * inherits it unusable - and the failure lands on consumers, not here.
 *
 * This checks the names against the rule table of the installed oxlint. Rule
 * namespaces oxlint does not ship (this package's own `@rikalabs/*`, or any
 * other external plugin) cannot be validated from that table and are counted
 * separately rather than passed over silently.
 */

const presetsDir = resolve(process.cwd(), "presets");

const rulesProcess = spawnSync("bunx", ["oxlint", "--rules", "--format", "json"], {
	encoding: "utf8",
	stdio: ["ignore", "pipe", "pipe"],
});

if (rulesProcess.status !== 0) {
	const stderr = rulesProcess.stderr || "";
	throw new Error(`Failed to query oxlint rules. ${stderr}`);
}

/** Oxlint lists a plugin's rules under its own spelling: `jsx_a11y`, not the
 * `jsx-a11y` a config writes. Normalise both sides before comparing. */
const normalise = (name: string): string => name.replaceAll("_", "-");

const builtInRules = new Set<string>();
const pluginNamespaces = new Set<string>();
const listed = JSON.parse(rulesProcess.stdout) as ReadonlyArray<{ scope: string; value: string }>;
for (const { scope, value } of listed) {
	pluginNamespaces.add(normalise(scope));
	builtInRules.add(`${normalise(scope)}/${value}`);
}
if (builtInRules.size === 0) {
	throw new Error("oxlint --rules listed no rules; the rule table format may have changed.");
}

type Finding = { readonly preset: string; readonly rule: string };

const missing: Finding[] = [];
const external = new Set<string>();
let checked = 0;

for (const file of readdirSync(presetsDir).filter((name) => name.endsWith(".json")).toSorted()) {
	const preset = JSON.parse(readFileSync(resolve(presetsDir, file), "utf8")) as {
		rules?: Record<string, unknown>;
		overrides?: ReadonlyArray<{ rules?: Record<string, unknown> }>;
	};
	const groups = [preset.rules ?? {}, ...(preset.overrides ?? []).map((o) => o.rules ?? {})];
	for (const group of groups) {
		for (const rule of Object.keys(group)) {
			const qualified = rule.includes("/") ? rule : `eslint/${rule}`;
			const namespace = normalise(qualified.split("/")[0] ?? "");
			if (!pluginNamespaces.has(namespace)) {
				external.add(namespace);
				continue;
			}
			checked += 1;
			if (!builtInRules.has(`${namespace}/${qualified.split("/").slice(1).join("/")}`)) {
				missing.push({ preset: file, rule });
			}
		}
	}
}

if (missing.length > 0) {
	const message = missing
		.map(({ preset, rule }) => `- ${preset} names '${rule}', which oxlint does not provide`)
		.join("\n");
	throw new Error(`Preset rule validation failed:\n${message}`);
}

const externalNote =
	external.size > 0 ? ` Namespaces not shipped by oxlint (not validated): ${[...external].toSorted().join(", ")}.` : "";
console.log(`Checked ${checked} preset rule names against ${builtInRules.size} oxlint rules.${externalNote}`);
