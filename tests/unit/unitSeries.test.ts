// BR-FIN-04 : une série par unité ; jamais d'addition entre unités, aucune conversion.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeUnit,
  unitDisplayLabel,
  groupQuantitiesByUnit,
  formatUnitTotals,
  percentagesSummingTo100,
  lastMonthKeys,
  monthKeyOf,
  buildMonthlySeriesByUnit,
  countByMonth,
  buildProvinceBreakdownByUnit,
  rankProvincesByUnit,
  resolveSelectedUnit,
  niceAxisScale,
  UNKNOWN_UNIT_LABEL,
} from "../../src/lib/utils/unitSeries.ts";

// Les espaces insécables du format fr-FR sont normalisés pour les comparaisons.
const plain = (s: string) => s.replace(/[  ]/g, " ");

test("normalizeUnit : trim + minuscules, libellé d'origine conservé", () => {
  assert.equal(normalizeUnit("  Tonne "), "tonne");
  assert.equal(normalizeUnit(null), "");
  assert.equal(unitDisplayLabel("  Caisses "), "Caisses");
  assert.equal(unitDisplayLabel(undefined), UNKNOWN_UNIT_LABEL);
});

test("groupQuantitiesByUnit : aucune addition entre unités différentes", () => {
  const totals = groupQuantitiesByUnit(
    [
      { q: 100, u: "tonne" },
      { q: 20, u: "Tonne " },
      { q: 40, u: "caisse" },
      { q: "15", u: "sac" },
      { q: Number.NaN, u: "sac" },
    ],
    (x) => x.q,
    (x) => x.u
  );
  assert.deepEqual(
    totals.map((t) => [t.unitKey, t.unitLabel, t.total, t.count]),
    [
      ["tonne", "tonne", 120, 2],
      ["caisse", "caisse", 40, 1],
      ["sac", "sac", 15, 1],
    ]
  );
  // Aucun total « global » mélangeant les unités (120 + 40 + 15 = 175) n'existe.
  assert.ok(!totals.some((t) => t.total === 175));
});

test("groupQuantitiesByUnit : pas de conversion kg → t", () => {
  const totals = groupQuantitiesByUnit(
    [
      { q: 1500, u: "kg" },
      { q: 2, u: "tonne" },
    ],
    (x) => x.q,
    (x) => x.u
  );
  const kg = totals.find((t) => t.unitKey === "kg");
  const t = totals.find((x) => x.unitKey === "tonne");
  assert.equal(kg?.total, 1500);
  assert.equal(t?.total, 2);
  assert.equal(totals.length, 2);
});

test("groupQuantitiesByUnit : unité absente → groupe dédié, jamais « tonne » supposée", () => {
  const totals = groupQuantitiesByUnit(
    [
      { q: 5, u: null },
      { q: 3, u: "tonne" },
    ],
    (x) => x.q,
    (x) => x.u
  );
  const unknown = totals.find((x) => x.unitKey === "");
  assert.equal(unknown?.total, 5);
  assert.equal(unknown?.unitLabel, UNKNOWN_UNIT_LABEL);
  assert.equal(totals.find((x) => x.unitKey === "tonne")?.total, 3);
});

test("formatUnitTotals : liste par unité, zéros omis, vide si rien", () => {
  assert.equal(
    plain(
      formatUnitTotals([
        { unitLabel: "t", total: 120 },
        { unitLabel: "caisses", total: 40 },
        { unitLabel: "sacs", total: 0 },
      ])
    ),
    "120 t · 40 caisses"
  );
  assert.equal(formatUnitTotals([]), "");
  assert.equal(plain(formatUnitTotals([{ unitLabel: "kg", total: 1500.456 }])), "1 500,46 kg");
});

test("percentagesSummingTo100 : somme exacte de 100, zéros si total nul", () => {
  const p = percentagesSummingTo100([1, 1, 1]);
  assert.equal(p.reduce((a, b) => a + b, 0), 100);
  assert.deepEqual(percentagesSummingTo100([0, 0]), [0, 0]);
  assert.deepEqual(percentagesSummingTo100([]), []);
  assert.deepEqual(percentagesSummingTo100([50]), [100]);
});

test("buildMonthlySeriesByUnit : une série par unité, sans conversion ni cumul inter-unités", () => {
  const months = ["2026-09", "2026-10", "2026-11"];
  const series = buildMonthlySeriesByUnit(
    [
      { date: new Date(2026, 8, 15), quantity: 1500, unit: "kg" },
      { date: new Date(2026, 9, 10), quantity: 2, unit: "tonne" },
      { date: new Date(2026, 9, 12), quantity: 3, unit: "Tonne" },
      { date: new Date(2026, 10, 1), quantity: 40, unit: "caisse" },
      { date: new Date(2026, 5, 1), quantity: 999, unit: "tonne" }, // hors fenêtre
      { date: "date invalide", quantity: 7, unit: "tonne" },
    ],
    months
  );
  const byKey = Object.fromEntries(series.map((s) => [s.unitKey, s]));
  assert.deepEqual(Object.keys(byKey).sort(), ["caisse", "kg", "tonne"]);
  assert.deepEqual(byKey.kg.values, [1500, 0, 0]); // pas de division par 1000
  assert.deepEqual(byKey.tonne.values, [0, 5, 0]);
  assert.equal(byKey.tonne.total, 5);
  assert.equal(byKey.tonne.unitLabel, "tonne");
  assert.deepEqual(byKey.caisse.values, [0, 0, 40]);
  assert.deepEqual(byKey.tonne.counts, [0, 2, 0]);
  // Tri : nombre d'enregistrements décroissant
  assert.equal(series[0].unitKey, "tonne");
});

test("countByMonth : décompte toutes unités (pas un volume)", () => {
  const months = ["2026-10", "2026-11"];
  assert.deepEqual(
    countByMonth(
      [
        { date: new Date(2026, 9, 3) },
        { date: new Date(2026, 9, 20) },
        { date: new Date(2026, 10, 2) },
        { date: new Date(2025, 0, 1) },
      ],
      months
    ),
    [2, 1]
  );
});

test("lastMonthKeys / monthKeyOf : fenêtre chronologique incluant le mois courant", () => {
  assert.deepEqual(lastMonthKeys(new Date(2026, 1, 10), 3), ["2025-12", "2026-01", "2026-02"]);
  assert.equal(monthKeyOf(new Date(2026, 0, 31)), "2026-01");
  assert.equal(monthKeyOf("pas une date"), null);
});

test("buildProvinceBreakdownByUnit : pourcentages calculés dans chaque unité (somme = 100)", () => {
  const { provinces, unitTotals } = buildProvinceBreakdownByUnit([
    { provinceId: "kin", provinceName: "Kinshasa", quantity: 100, unit: "tonne" },
    { provinceId: "kin", provinceName: "Kinshasa", quantity: 10, unit: "caisse" },
    { provinceId: "kin", provinceName: "Kinshasa", quantity: 5, unit: "caisse" },
    { provinceId: "kc", provinceName: "Kongo Central", quantity: 50, unit: "Tonne" },
    { provinceId: "kc", provinceName: "Kongo Central", quantity: 1000, unit: "kg" },
    { provinceId: "nk", provinceName: "Nord-Kivu", quantity: 1, unit: "caisse" },
    { provinceId: "nk", provinceName: "Nord-Kivu", quantity: 1, unit: "caisse" },
    { provinceId: "nk", provinceName: "Nord-Kivu", quantity: 1, unit: "caisse" },
  ]);

  // Totaux par unité, jamais additionnés ni convertis
  const totals = Object.fromEntries(unitTotals.map((u) => [u.unitKey, u.total]));
  assert.deepEqual(totals, { caisse: 18, tonne: 150, kg: 1000 });

  // Pour chaque unité, la somme des pourcentages vaut exactement 100
  for (const unit of unitTotals) {
    const sum = provinces
      .flatMap((p) => p.units)
      .filter((s) => s.unitKey === unit.unitKey)
      .reduce((acc, s) => acc + s.percentage, 0);
    assert.equal(sum, 100, `unité ${unit.unitKey}`);
  }

  const kin = provinces.find((p) => p.provinceId === "kin")!;
  const kinTonne = kin.units.find((u) => u.unitKey === "tonne")!;
  assert.equal(kinTonne.quantity, 100);
  assert.equal(kinTonne.percentage, 67); // 100 / 150 t, pas 100 / (150 + 18 + 1000)
  const kc = provinces.find((p) => p.provinceId === "kc")!;
  assert.equal(kc.units.find((u) => u.unitKey === "kg")!.percentage, 100);
  assert.equal(kc.units.find((u) => u.unitKey === "kg")!.quantity, 1000); // pas 1 t

  // Classement par nombre de demandes (critère indépendant des unités)
  assert.deepEqual(
    provinces.map((p) => [p.provinceId, p.demandsCount]),
    [
      ["kin", 3],
      ["nk", 3],
      ["kc", 2],
    ]
  );
});

test("buildProvinceBreakdownByUnit : entrée vide ou nulle", () => {
  assert.deepEqual(buildProvinceBreakdownByUnit([]), { provinces: [], unitTotals: [] });
  assert.deepEqual(buildProvinceBreakdownByUnit(null), { provinces: [], unitTotals: [] });
  assert.deepEqual(buildMonthlySeriesByUnit([], ["2026-11"]), []);
  assert.deepEqual(groupQuantitiesByUnit(undefined, () => 0, () => "t"), []);
});

test("« tonne » et « tonnes » restent deux unités distinctes", () => {
  const series = buildMonthlySeriesByUnit(
    [
      { date: new Date(2026, 10, 2), quantity: 10, unit: "tonne" },
      { date: new Date(2026, 10, 3), quantity: 4, unit: "tonnes" },
    ],
    ["2026-11"]
  );
  assert.deepEqual(series.map((s) => s.unitKey).sort(), ["tonne", "tonnes"]);
  assert.equal(series.find((s) => s.unitKey === "tonne")?.total, 10);
  assert.equal(series.find((s) => s.unitKey === "tonnes")?.total, 4);
});

test("resolveSelectedUnit : choix conservé, repli sur la première, clé vide valide", () => {
  const units = [{ unitKey: "tonne" }, { unitKey: "" }, { unitKey: "kg" }];
  assert.equal(resolveSelectedUnit(units, "kg")?.unitKey, "kg");
  assert.equal(resolveSelectedUnit(units, "")?.unitKey, "");
  assert.equal(resolveSelectedUnit(units, "sac")?.unitKey, "tonne"); // retirée par un filtre
  assert.equal(resolveSelectedUnit(units, null)?.unitKey, "tonne");
  assert.equal(resolveSelectedUnit([], "kg"), null);
});

test("rankProvincesByUnit : classement par quantité dans l'unité, autres unités écartées", () => {
  const share = (unitKey: string, quantity: number, demandsCount: number, percentage = 0) => ({
    unitKey,
    unitLabel: unitKey,
    quantity,
    demandsCount,
    percentage,
  });
  const provinces = [
    { provinceName: "Kinshasa", quantitiesByUnit: [share("kg", 15000, 9), share("tonne", 5, 1)] },
    { provinceName: "Kongo", quantitiesByUnit: [share("tonne", 500, 1)] },
    { provinceName: "Kasaï", quantitiesByUnit: [share("kg", 20, 1)] },
    { provinceName: "Équateur", quantitiesByUnit: [share("tonne", 5, 3)] },
    { provinceName: "Bandundu", quantitiesByUnit: [share("tonne", 5, 3)] },
  ];
  // À quantité égale : nombre de demandes, puis nom.
  assert.deepEqual(
    rankProvincesByUnit(provinces, "tonne").map((r) => r.province.provinceName),
    ["Kongo", "Bandundu", "Équateur", "Kinshasa"]
  );
  // 15 000 kg ne pèsent rien dans le classement en tonnes, et inversement.
  assert.deepEqual(
    rankProvincesByUnit(provinces, "kg").map((r) => [r.province.provinceName, r.share.quantity]),
    [
      ["Kinshasa", 15000],
      ["Kasaï", 20],
    ]
  );
  assert.deepEqual(rankProvincesByUnit(provinces, "sac"), []);
});

test("niceAxisScale : 4 ou 5 graduations rondes qui couvrent le maximum", () => {
  assert.deepEqual(niceAxisScale(501), { ticks: [0, 200, 400, 600], max: 600 });
  assert.deepEqual(niceAxisScale(15486), {
    ticks: [0, 5000, 10000, 15000, 20000],
    max: 20000,
  });
  assert.deepEqual(niceAxisScale(0.75).ticks, [0, 0.2, 0.4, 0.6, 0.8]);
  for (const max of [0.01, 0.3, 1, 3, 7, 9.5, 42, 100, 999, 1234567, 5e9]) {
    const { ticks, max: top } = niceAxisScale(max);
    assert.ok(ticks.length === 4 || ticks.length === 5, `${max} : ${ticks.length} graduations`);
    assert.equal(ticks[0], 0);
    assert.ok(top >= max, `${max} couvert par ${top}`);
    assert.equal(new Set(ticks).size, ticks.length, `${max} : graduations distinctes`);
  }
});

test("niceAxisScale : décompte entier et absence de valeur", () => {
  assert.deepEqual(niceAxisScale(1, { integerOnly: true }).ticks, [0, 1, 2, 3]);
  assert.deepEqual(niceAxisScale(5, { integerOnly: true }).ticks, [0, 2, 4, 6]);
  for (const max of [1, 2, 3, 7, 13, 500]) {
    const { ticks } = niceAxisScale(max, { integerOnly: true });
    assert.ok(ticks.every(Number.isInteger), `${max} : ${ticks}`);
  }
  assert.deepEqual(niceAxisScale(0).ticks, [0, 1, 2, 3]);
  assert.deepEqual(niceAxisScale(Number.NaN).ticks, [0, 1, 2, 3]);
});

test("buildProvinceBreakdownByUnit : total nul dans une unité → 0 %, pas de division par zéro", () => {
  const { provinces } = buildProvinceBreakdownByUnit([
    { provinceId: "a", provinceName: "A", quantity: 0, unit: "sac" },
    { provinceId: "b", provinceName: "B", quantity: 0, unit: "sac" },
  ]);
  assert.deepEqual(
    provinces.map((p) => p.units[0].percentage),
    [0, 0]
  );
});
