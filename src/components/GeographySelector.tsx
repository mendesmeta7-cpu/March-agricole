"use client";

import { useEffect, useState } from "react";
import { fetchCountries, fetchProvinces, fetchCities, Country, Province, City } from "@/lib/queries/geography";

interface GeographySelectorProps {
  required?: boolean;
  defaultCountryCode?: string;
  defaultProvinceName?: string;
  showCityInput?: boolean;
}

export default function GeographySelector({
  required = true,
  defaultCountryCode = "COD",
  showCityInput = true,
}: GeographySelectorProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [selectedCountryId, setSelectedCountryId] = useState<string>("");
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");

  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingProvinces, setLoadingProvinces] = useState(false);

  // Charger les pays réels au montage
  useEffect(() => {
    async function loadCountries() {
      setLoadingCountries(true);
      const data = await fetchCountries();
      setCountries(data);
      if (data.length > 0) {
        // Présélectionner RDC si disponible
        const defaultCountry = data.find((c) => c.code === defaultCountryCode) || data[0];
        setSelectedCountryId(defaultCountry.id);
      }
      setLoadingCountries(false);
    }
    loadCountries();
  }, [defaultCountryCode]);

  // Charger les provinces réelles lors de la sélection du pays
  useEffect(() => {
    if (!selectedCountryId) {
      setProvinces([]);
      setSelectedProvinceId("");
      return;
    }
    async function loadProvinces() {
      setLoadingProvinces(true);
      const data = await fetchProvinces(selectedCountryId);
      setProvinces(data);
      if (data.length > 0) {
        setSelectedProvinceId(data[0].id);
      } else {
        setSelectedProvinceId("");
      }
      setLoadingProvinces(false);
    }
    loadProvinces();
  }, [selectedCountryId]);

  // Charger les villes pour la province sélectionnée
  useEffect(() => {
    if (!selectedProvinceId) {
      setCities([]);
      return;
    }
    async function loadCities() {
      const data = await fetchCities(selectedProvinceId);
      setCities(data);
    }
    loadCities();
  }, [selectedProvinceId]);

  return (
    <div className="space-y-4">
      {/* Sélecteur de Pays */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-forest-900 mb-1">
          Pays {required && <span className="text-red-500">*</span>}
        </label>
        {loadingCountries ? (
          <div className="h-11 w-full animate-pulse bg-gray-100 rounded-xl border border-gray-200" />
        ) : (
          <select
            name="countryId"
            value={selectedCountryId}
            onChange={(e) => setSelectedCountryId(e.target.value)}
            required={required}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all outline-none min-h-[44px] text-sm"
          >
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name} ({country.code})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Sélecteur de Province */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-forest-900 mb-1">
          Province / Région {required && <span className="text-red-500">*</span>}
        </label>
        {loadingProvinces ? (
          <div className="h-11 w-full animate-pulse bg-gray-100 rounded-xl border border-gray-200" />
        ) : (
          <select
            name="provinceId"
            value={selectedProvinceId}
            onChange={(e) => setSelectedProvinceId(e.target.value)}
            required={required}
            disabled={provinces.length === 0}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all outline-none disabled:bg-gray-50 disabled:text-gray-400 min-h-[44px] text-sm"
          >
            {provinces.length === 0 ? (
              <option value="">Aucune province disponible</option>
            ) : (
              provinces.map((prov) => (
                <option key={prov.id} value={prov.id}>
                  {prov.name} ({prov.code})
                </option>
              ))
            )}
          </select>
        )}
      </div>

      {/* Ville */}
      {showCityInput && (
        <div>
          <label className="block text-xs sm:text-sm font-medium text-forest-900 mb-1">
            Ville / Territoire
          </label>
          {cities.length > 0 ? (
            <select
              name="city"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all outline-none min-h-[44px] text-sm"
            >
              <option value="">Sélectionnez une ville...</option>
              {cities.map((city) => (
                <option key={city.id} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              name="city"
              placeholder="Ex: Tshikapa, Kananga, Matadi..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all outline-none min-h-[44px] text-sm"
            />
          )}
        </div>
      )}
    </div>
  );
}
