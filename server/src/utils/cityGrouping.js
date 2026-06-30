const CITY_GROUPS = {
  AE: {
    Dubai: {
      cityCodes: [
        "115936",
        "407544",
        "221830",
        "346887",
        "121792",
        "337165",
        "369509",
        "116319",
      ],
      areaDisplayOrder: [
        "Dubai Marina",
        "Dubai Internet City",
        "Dubai Festival City",
        "Palm Jumeirah",
        "Jumeirah",
        "Jebel Ali",
        "Deira",
      ],
    },
  },
};

const METRO_DISPLAY_TYPE = "METRO";
const AREA_DISPLAY_TYPE = "AREA";

const normalizeCode = (value) => String(value || "").trim();
const normalizeName = (value) => String(value || "").trim();
const normalizeCountryCode = (value) => normalizeCode(value).toUpperCase();

const getCityCode = (city = {}) =>
  normalizeCode(city.cityCode || city.CityCode || city.Code || city.code);

const getCityName = (city = {}) =>
  normalizeName(city.cityName || city.CityName || city.Name || city.name);

const getCountryCode = (city = {}, fallback = "") =>
  normalizeCountryCode(
    city.countryCode || city.CountryCode || city.country || fallback,
  );

const getCountryName = (city = {}) =>
  normalizeName(city.countryName || city.CountryName || city.country || "");

const getGroupConfig = (countryCode, metroName) =>
  CITY_GROUPS[normalizeCountryCode(countryCode)]?.[metroName] || null;

const findMetroByCityCode = (cityCode, countryCode = "") => {
  const normalizedCityCode = normalizeCode(cityCode);
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const countries = normalizedCountryCode
    ? [normalizedCountryCode]
    : Object.keys(CITY_GROUPS);

  for (const country of countries) {
    const groups = CITY_GROUPS[country] || {};
    for (const [metroName, config] of Object.entries(groups)) {
      if ((config.cityCodes || []).map(normalizeCode).includes(normalizedCityCode)) {
        return { countryCode: country, metroName, config };
      }
    }
  }

  return null;
};

const buildAreaSortIndex = (config = {}) =>
  (config.areaDisplayOrder || []).reduce((lookup, name, index) => {
    lookup[normalizeName(name).toLowerCase()] = index;
    return lookup;
  }, {});

const sortAreas = (areas = [], config = {}) => {
  const sortIndex = buildAreaSortIndex(config);

  return [...areas].sort((left, right) => {
    const leftIndex = sortIndex[getCityName(left).toLowerCase()];
    const rightIndex = sortIndex[getCityName(right).toLowerCase()];

    if (leftIndex !== undefined || rightIndex !== undefined) {
      return (leftIndex ?? Number.MAX_SAFE_INTEGER) - (rightIndex ?? Number.MAX_SAFE_INTEGER);
    }

    return getCityName(left).localeCompare(getCityName(right));
  });
};

const toAreaOption = (city, metroName = "") => ({
  ...city,
  cityName: getCityName(city),
  cityCode: getCityCode(city),
  countryCode: getCountryCode(city),
  countryName: getCountryName(city),
  displayName: getCityName(city),
  displayType: AREA_DISPLAY_TYPE,
  parentMetro: metroName || city.parentMetro || null,
});

const toMetroOption = ({ metroName, config, citiesByCode, countryCode }) => {
  const configuredCodes = (config.cityCodes || []).map(normalizeCode).filter(Boolean);
  const rootCity =
    citiesByCode.get(configuredCodes[0]) ||
    [...citiesByCode.values()].find(
      (city) => getCityName(city).toLowerCase() === metroName.toLowerCase(),
    ) ||
    {};

  const areas = sortAreas(
    configuredCodes
      .map((code) => citiesByCode.get(code))
      .filter((city) => city && getCityName(city).toLowerCase() !== metroName.toLowerCase()),
    config,
  );

  return {
    ...rootCity,
    cityName: `${metroName} (All Areas)`,
    cityCode: configuredCodes[0] || getCityCode(rootCity),
    countryCode: getCountryCode(rootCity, countryCode),
    countryName: getCountryName(rootCity),
    displayName: metroName,
    displayType: METRO_DISPLAY_TYPE,
    cityCodes: configuredCodes,
    childAreas: areas.map(getCityName),
    metroName,
  };
};

const normalizeGroupedCities = (cities = []) =>
  cities.map((city) => {
    if (city.displayType === METRO_DISPLAY_TYPE) {
      return {
        ...city,
        cityName: city.cityName || `${city.displayName} (All Areas)`,
        cityCode: getCityCode(city),
        cityCodes: Array.isArray(city.cityCodes)
          ? city.cityCodes.map(normalizeCode).filter(Boolean)
          : [getCityCode(city)].filter(Boolean),
        childAreas: Array.isArray(city.childAreas) ? city.childAreas : [],
      };
    }

    return toAreaOption(city, city.parentMetro || "");
  });

const groupCitiesByMetro = (cities = [], countryCode = "") => {
  if (!Array.isArray(cities) || cities.length === 0) return [];
  if (cities.some((city) => city?.displayType)) return normalizeGroupedCities(cities);

  const normalizedCountryCode = normalizeCountryCode(
    countryCode || getCountryCode(cities[0]),
  );
  const groups = CITY_GROUPS[normalizedCountryCode] || {};
  const citiesByCode = new Map();

  cities.forEach((city) => {
    const code = getCityCode(city);
    if (code) citiesByCode.set(code, city);
  });

  const consumedCodes = new Set();
  const groupedCities = [];

  Object.entries(groups).forEach(([metroName, config]) => {
    const configuredCodes = (config.cityCodes || []).map(normalizeCode).filter(Boolean);
    const presentCodes = configuredCodes.filter((code) => citiesByCode.has(code));
    if (!presentCodes.length) return;

    const hasRootCity = presentCodes.some(
      (code) => getCityName(citiesByCode.get(code)).toLowerCase() === metroName.toLowerCase(),
    );
    const searchScopedToArea = presentCodes.length === 1 && !hasRootCity;

    if (!searchScopedToArea) {
      groupedCities.push(
        toMetroOption({ metroName, config, citiesByCode, countryCode: normalizedCountryCode }),
      );
      configuredCodes.forEach((code) => consumedCodes.add(code));

      sortAreas(
        presentCodes
          .map((code) => citiesByCode.get(code))
          .filter((city) => getCityName(city).toLowerCase() !== metroName.toLowerCase()),
        config,
      ).forEach((city) => groupedCities.push(toAreaOption(city, metroName)));
      return;
    }

    groupedCities.push(toAreaOption(citiesByCode.get(presentCodes[0]), metroName));
    consumedCodes.add(presentCodes[0]);
  });

  cities
    .filter((city) => !consumedCodes.has(getCityCode(city)))
    .map((city) => {
      const metro = findMetroByCityCode(getCityCode(city), normalizedCountryCode);
      return toAreaOption(city, metro?.metroName || "");
    })
    .sort((left, right) => getCityName(left).localeCompare(getCityName(right)))
    .forEach((city) => groupedCities.push(city));

  return groupedCities;
};

const isMetroSearch = (selection = {}) => {
  const displayType = selection.displayType || selection.CityDisplayType;
  if (displayType === METRO_DISPLAY_TYPE) return true;

  const cityName = normalizeName(selection.cityName || selection.CityName);
  if (cityName.toLowerCase().endsWith("(all areas)")) return true;

  const cityCode = selection.cityCode || selection.CityCode;
  const countryCode = selection.countryCode || selection.CountryCode;
  const metro = findMetroByCityCode(cityCode, countryCode);
  return Boolean(metro && normalizeName(selection.metroName || selection.MetroCityName) === metro.metroName);
};

const expandMetroCityCodes = (selection = {}) => {
  const cityCode = normalizeCode(selection.cityCode || selection.CityCode);
  const countryCode = normalizeCountryCode(selection.countryCode || selection.CountryCode);
  const requestedCodes = Array.isArray(selection.cityCodes || selection.CityCodes)
    ? (selection.cityCodes || selection.CityCodes).map(normalizeCode).filter(Boolean)
    : [];

  if (!isMetroSearch(selection)) return [cityCode].filter(Boolean);

  const metro =
    findMetroByCityCode(cityCode, countryCode) ||
    (selection.metroName || selection.MetroCityName
      ? {
          countryCode,
          metroName: selection.metroName || selection.MetroCityName,
          config: getGroupConfig(countryCode, selection.metroName || selection.MetroCityName),
        }
      : null);

  const configuredCodes = (metro?.config?.cityCodes || []).map(normalizeCode).filter(Boolean);

  if (configuredCodes.length) return configuredCodes;
  if (requestedCodes.length) return [...new Set(requestedCodes)];
  return [cityCode].filter(Boolean);
};

const getMetroAreas = (selection = {}, cities = []) => {
  const cityCode = selection.cityCode || selection.CityCode;
  const countryCode = selection.countryCode || selection.CountryCode;
  const metro = findMetroByCityCode(cityCode, countryCode);

  if (!metro) return [];

  if (Array.isArray(selection.childAreas || selection.MetroAreas)) {
    return selection.childAreas || selection.MetroAreas;
  }

  const grouped = groupCitiesByMetro(cities, metro.countryCode);
  return (
    grouped.find(
      (city) =>
        city.displayType === METRO_DISPLAY_TYPE &&
        city.displayName === metro.metroName,
    )?.childAreas || []
  );
};

module.exports = {
  AREA_DISPLAY_TYPE,
  CITY_GROUPS,
  METRO_DISPLAY_TYPE,
  expandMetroCityCodes,
  getMetroAreas,
  groupCitiesByMetro,
  isMetroSearch,
};
