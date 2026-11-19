// Lot 2C : distinguer une absence réelle (ou plusieurs lignes) d'une panne de lecture.
// Les cas « réels » passent par la vraie bibliothèque postgrest-js du projet, avec une
// réponse HTTP simulée : aucun appel réseau, aucune base Supabase.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PostgrestClient } from "@supabase/postgrest-js";
import {
  MULTIPLE_ROWS_ERROR_CODE,
  MALFORMED_VALUE_ERROR_CODE,
  isMultipleRowsError,
  isMalformedIdError,
  readRows,
  readOptionalRow,
} from "../../src/lib/utils/readErrors.ts";

/** Client postgrest-js dont chaque requête reçoit la réponse donnée. */
function clientAnswering(respond: () => Promise<Response>) {
  return new PostgrestClient("http://banc.invalid/rest/v1", { fetch: respond as typeof fetch });
}
const json = (body: unknown, status = 200) => async () =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const membershipOf = (client: ReturnType<typeof clientAnswering>) =>
  client.from("company_members").select("company_id").eq("user_id", "u-1").maybeSingle();

test("codes reconnus : plusieurs lignes et identifiant mal formé", () => {
  assert.equal(MULTIPLE_ROWS_ERROR_CODE, "PGRST116");
  assert.equal(MALFORMED_VALUE_ERROR_CODE, "22P02");
  assert.equal(isMultipleRowsError({ code: "PGRST116" }), true);
  assert.equal(isMultipleRowsError({ code: "PGRST301" }), false);
  assert.equal(isMultipleRowsError({ code: "" }), false);
  assert.equal(isMultipleRowsError(null), false);
  assert.equal(isMultipleRowsError(undefined), false);
  assert.equal(isMalformedIdError({ code: "22P02" }), true);
  assert.equal(isMalformedIdError({ code: "42501" }), false);
  assert.equal(isMalformedIdError(null), false);
});

test("postgrest-js : un membre de plusieurs sociétés donne « plusieurs lignes », pas une panne", async () => {
  const res = await membershipOf(clientAnswering(json([{ company_id: "a" }, { company_id: "b" }])));
  assert.equal(res.data, null);
  assert.equal(isMultipleRowsError(res.error), true);
  assert.equal(isMalformedIdError(res.error), false);
});

test("postgrest-js : un seul rattachement est lu sans erreur", async () => {
  const res = await membershipOf(clientAnswering(json([{ company_id: "a" }])));
  assert.equal(res.error, null);
  assert.deepEqual(res.data, { company_id: "a" });
});

test("postgrest-js : aucun rattachement = absence réelle, sans erreur", async () => {
  const res = await membershipOf(clientAnswering(json([])));
  assert.equal(res.error, null);
  assert.equal(res.data, null);
});

test("postgrest-js : une erreur serveur est une panne, jamais « plusieurs lignes »", async () => {
  for (const [status, code] of [[500, "XX000"], [503, "PGRST000"], [401, "PGRST301"], [500, "57014"]] as const) {
    const res = await membershipOf(clientAnswering(json({ code, message: "panne simulée", details: null, hint: null }, status)));
    assert.equal(res.data, null, `${status} ${code}`);
    assert.ok(res.error, `${status} ${code}`);
    assert.equal(isMultipleRowsError(res.error), false, `${status} ${code}`);
    assert.equal(isMalformedIdError(res.error), false, `${status} ${code}`);
  }
});

test("postgrest-js : une coupure réseau est une panne, jamais « plusieurs lignes »", async () => {
  const res = await membershipOf(clientAnswering(async () => { throw new TypeError("fetch failed"); }));
  assert.equal(res.data, null);
  assert.ok(res.error);
  assert.equal(isMultipleRowsError(res.error), false);
});

test("postgrest-js : un identifiant d'URL mal formé est reconnu comme absence", async () => {
  const client = clientAnswering(json({ code: "22P02", message: 'invalid input syntax for type uuid: "abc"', details: null, hint: null }, 400));
  const res = await client.from("productions").select("id").eq("id", "abc").maybeSingle();
  assert.equal(isMalformedIdError(res.error), true);
  assert.equal(isMultipleRowsError(res.error), false);
});

test("readRows : liste lue, liste vide, panne", async () => {
  assert.deepEqual(await readRows(Promise.resolve({ data: [{ id: 1 }], error: null }), "x"), [{ id: 1 }]);
  assert.deepEqual(await readRows(Promise.resolve({ data: [], error: null }), "x"), []);
  assert.deepEqual(await readRows(Promise.resolve({ data: null, error: null }), "x"), []);
  await assert.rejects(readRows(Promise.resolve({ data: null, error: { code: "XX000" } }), "provinces"), /Lecture impossible : provinces/);
});

test("readRows : fonctionne avec une vraie requête postgrest-js", async () => {
  const ok = clientAnswering(json([{ id: "p1", name: "Kinshasa" }]));
  assert.deepEqual(await readRows(ok.from("provinces").select("id, name").order("name"), "provinces"), [{ id: "p1", name: "Kinshasa" }]);
  const down = clientAnswering(json({ code: "XX000", message: "panne" }, 500));
  await assert.rejects(readRows(down.from("provinces").select("id, name"), "provinces"), /Lecture impossible/);
});

test("readOptionalRow : ligne lue, ligne absente, panne", async () => {
  const one = clientAnswering(json([{ id: "r1", status: "proposed" }]));
  assert.deepEqual(
    await readOptionalRow(one.from("demand_responses").select("id, status").eq("demand_id", "d").eq("company_id", "c").maybeSingle(), "proposition"),
    { id: "r1", status: "proposed" }
  );
  const none = clientAnswering(json([]));
  assert.equal(await readOptionalRow(none.from("demand_responses").select("id").maybeSingle(), "proposition"), null);
  const down = clientAnswering(json({ code: "XX000", message: "panne" }, 500));
  await assert.rejects(readOptionalRow(down.from("demand_responses").select("id").maybeSingle(), "proposition existante"), /Lecture impossible : proposition existante/);
});
