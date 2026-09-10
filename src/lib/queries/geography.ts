import { createClient } from "@/lib/supabase/client";

export interface Country {
  id: string;
  code: string;
  name: string;
  currency_code: string;
}

export interface Province {
  id: string;
  country_id: string;
  code: string;
  name: string;
}

export interface City {
  id: string;
  province_id: string;
  name: string;
}

export async function fetchCountries(): Promise<Country[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("countries")
    .select("id, code, name, currency_code")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Erreur chargement pays:", error);
    return [];
  }
  return data || [];
}

export async function fetchProvinces(countryId: string): Promise<Province[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("provinces")
    .select("id, country_id, code, name")
    .eq("country_id", countryId)
    .order("name");

  if (error) {
    console.error("Erreur chargement provinces:", error);
    return [];
  }
  return data || [];
}

export async function fetchCities(provinceId: string): Promise<City[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cities")
    .select("id, province_id, name")
    .eq("province_id", provinceId)
    .order("name");

  if (error) {
    console.error("Erreur chargement villes:", error);
    return [];
  }
  return data || [];
}
