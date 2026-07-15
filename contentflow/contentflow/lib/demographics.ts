import { prisma } from "@/lib/db";

export type DemographicItem = { label: string; percent: number };

export type BrandDemographics = {
  gender: DemographicItem[];
  age: DemographicItem[];
  topCountries: DemographicItem[];
  topCities: DemographicItem[];
  hasData: boolean;
};

type RawItem = { label: string; value: number };

const GENDER_LABELS: Record<string, string> = { M: "Male", F: "Female", U: "Unspecified" };

const countryNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

function toPercentItems(items: RawItem[], labelFor: (label: string) => string, limit?: number) {
  const total = items.reduce((sum, i) => sum + i.value, 0);
  if (total === 0) return [];
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const limited = limit ? sorted.slice(0, limit) : sorted;
  return limited.map((i) => ({ label: labelFor(i.label), percent: (i.value / total) * 100 }));
}

/**
 * Combines demographics across every connected account for a brand by
 * summing raw values before converting to percentages, so a brand with
 * multiple connected accounts still gets one unified breakdown.
 */
export async function getBrandAudienceDemographics(brandId: string): Promise<BrandDemographics> {
  const accounts = await prisma.socialAccount.findMany({
    where: { brandId, status: "connected" },
    include: { demographics: true },
  });

  function combine(key: "genderData" | "ageData" | "countryData" | "cityData"): RawItem[] {
    const totals = new Map<string, number>();
    for (const account of accounts) {
      const items = (account.demographics?.[key] as RawItem[] | undefined) ?? [];
      for (const item of items) {
        totals.set(item.label, (totals.get(item.label) ?? 0) + item.value);
      }
    }
    return Array.from(totals, ([label, value]) => ({ label, value }));
  }

  const gender = toPercentItems(combine("genderData"), (l) => GENDER_LABELS[l] ?? l);
  const age = toPercentItems(combine("ageData"), (l) => l);
  const topCountries = toPercentItems(
    combine("countryData"),
    (l) => countryNames?.of(l) ?? l,
    5
  );
  const topCities = toPercentItems(combine("cityData"), (l) => l, 5);

  return {
    gender,
    age,
    topCountries,
    topCities,
    hasData: gender.length > 0 || age.length > 0 || topCountries.length > 0 || topCities.length > 0,
  };
}
