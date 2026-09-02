import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Guards the multi-tenant boundary at the source level.
 *
 * Every server action takes ids straight from the client. An action that
 * mutates by id alone will happily edit another customer's row - that was a
 * real, exploitable hole here, and it had spread across ~35 actions before
 * anyone noticed, because each one looked fine on its own.
 *
 * So this doesn't test behaviour, it tests the *shape of the code*: it reads
 * every action file and fails if a write isn't scoped to the caller's
 * workspace. That catches the mistake in actions nobody has written yet,
 * which a runtime test against today's actions never would.
 */

const ACTIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "actions");

/** Prisma calls that change data. Reads are scoped at the page/lib layer. */
const MUTATIONS = /prisma\.(\w+)\.(update|updateMany|delete|deleteMany|upsert)\(/g;

/**
 * A `where` clause counts as scoped when it constrains the row to the
 * caller's workspace - directly, or through the parent that owns it.
 */
const SCOPE_MARKERS = [
  "workspaceId",
  "contract: {", // payments belong to a contract
  "competitor: {", // snapshots and posts belong to a competitor
  "brand: {", // social accounts belong to a brand
];

/**
 * Writes that are safe for a reason the pattern above can't see. Each one was
 * reviewed by hand; adding to this list is a deliberate act, which is the
 * point - a new unscoped write fails the test until someone justifies it here.
 */
const REVIEWED_EXCEPTIONS: { file: string; snippet: string; why: string }[] = [
  {
    file: "billing.ts",
    snippet: "id: ctx.workspace.id",
    why: "Targets the caller's own workspace row by definition.",
  },
  {
    file: "discovery.ts",
    snippet: "id: ctx.workspace.id",
    why: "Targets the caller's own workspace row by definition.",
  },
  {
    file: "settings.ts",
    snippet: "id: brandId",
    why: "Preceded by a findFirst that proves the brand is in the caller's workspace.",
  },
  {
    file: "media.ts",
    snippet: "id: owned.id",
    why: "`owned` comes from a workspace-scoped findFirst on the line above.",
  },
  {
    file: "opportunities.ts",
    snippet: "id: matchId",
    why: "Both callers compare the match's workspace against the caller's before writing.",
  },
  {
    file: "opportunities.ts",
    snippet: "where: { matchId }",
    why: "Runs after updateMatchStatus has verified the caller owns one side of the match.",
  },
  {
    file: "creators.ts",
    snippet: "campaignId_creatorId",
    why: "Preceded by a findFirst proving the campaign is in the caller's workspace; the join row has no workspace of its own.",
  },
  {
    file: "settings.ts",
    snippet: "where: { brandId }",
    why: "Guarded by the same brand-ownership findFirst as the brand rename just above it.",
  },
];

/** The body of a call expression starting at `from`, balanced on parentheses. */
function callBody(source: string, from: number) {
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    if (source[i] === "(") depth++;
    else if (source[i] === ")") {
      depth--;
      if (depth === 0) return source.slice(from, i + 1);
    }
  }
  return source.slice(from);
}

function actionFiles() {
  return readdirSync(ACTIONS_DIR).filter((f) => f.endsWith(".ts"));
}

test("every write in a server action is scoped to the caller's workspace", () => {
  const unscoped: string[] = [];

  for (const file of actionFiles()) {
    const source = readFileSync(join(ACTIONS_DIR, file), "utf8");

    for (const match of source.matchAll(MUTATIONS)) {
      const body = callBody(source, match.index! + match[0].length - 1);
      const scoped = SCOPE_MARKERS.some((marker) => body.includes(marker));
      if (scoped) continue;

      const excused = REVIEWED_EXCEPTIONS.some(
        (e) => e.file === file && body.includes(e.snippet)
      );
      if (excused) continue;

      const line = source.slice(0, match.index).split("\n").length;
      unscoped.push(`${file}:${line}  prisma.${match[1]}.${match[2]}(...)`);
    }
  }

  assert.deepEqual(
    unscoped,
    [],
    `These writes accept an id from the client without limiting it to the caller's workspace.\n` +
      `Add a workspace filter (or a scoped parent relation) to the where clause. If it is\n` +
      `genuinely safe, say why in REVIEWED_EXCEPTIONS in this file.\n\n` +
      unscoped.map((u) => `  - ${u}`).join("\n")
  );
});

test("no server action resolves the caller with requireUser alone", () => {
  // requireUser only answers "is somebody logged in" - it never says *which*
  // workspace the caller is acting in, so it can't scope a write on its own.
  // Any of these three establishes that: the helper added with this fix, the
  // context loader the older actions use, or an explicit membership check.
  const RESOLVES_WORKSPACE = [
    "requireWorkspace(",
    "getCurrentWorkspaceAndBrand(",
    "requireMembership(",
  ];
  const offenders: string[] = [];

  for (const file of actionFiles()) {
    const source = readFileSync(join(ACTIONS_DIR, file), "utf8");
    if (!MUTATIONS.test(source)) {
      MUTATIONS.lastIndex = 0;
      continue;
    }
    MUTATIONS.lastIndex = 0;
    if (!RESOLVES_WORKSPACE.some((fn) => source.includes(fn))) {
      offenders.push(file);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `These action files mutate data but never resolve a workspace:\n` +
      offenders.map((f) => `  - ${f}`).join("\n")
  );
});

test("paid features check the plan in the action, not only on the page", () => {
  // A page-level redirect only hides the screen. Anyone can still call the
  // action directly, so the paid ones have to check the plan themselves.
  const PRO_ACTIONS = [
    "campaigns.ts",
    "contracts.ts",
    "creators.ts",
    "competitors.ts",
    "opportunities.ts",
    "reports.ts",
  ];

  const missing = PRO_ACTIONS.filter((file) => {
    const source = readFileSync(join(ACTIONS_DIR, file), "utf8");
    return !source.includes('requireWorkspace("pro")');
  });

  assert.deepEqual(
    missing,
    [],
    `These Pro features don't enforce the plan server-side:\n` +
      missing.map((f) => `  - ${f}`).join("\n")
  );
});
