export const MATNOG_LOCATION = {
  name: "Matnog, Sorsogon",
  latitude: 12.5861,
  longitude: 124.0856,
} as const;

export type WeatherCurrent = {
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  weatherCode: number;
  cloudCover: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
};

export type DailyWeather = {
  date: string;
  weatherCode: number;
  temperatureMax: number;
  temperatureMin: number;
  precipitation: number;
  precipitationProbability: number;
  windSpeed: number;
  windGusts: number;
  sunrise: string;
  sunset: string;
};

export type WeatherMonitoring = {
  current: WeatherCurrent;
  daily: DailyWeather[];
  next24Hours: {
    precipitation: number;
    precipitationProbability: number;
    maximumWind: number;
    maximumGust: number;
  };
};

export type MarineMonitoring = {
  time: string;
  waveHeight: number;
  waveDirection: number;
  wavePeriod: number;
  swellHeight: number;
  seaTemperature: number;
  currentVelocity: number;
  currentDirection: number;
  sevenDayMaximumWave: number;
};

export type EarthquakeEvent = {
  id: string;
  magnitude: number;
  place: string;
  occurredAt: string;
  updatedAt: string;
  depth: number;
  distanceFromMatnog: number;
  tsunamiIndicator: boolean;
  reviewStatus: string;
  url: string;
};

export type HazardEvent = {
  id: string;
  type: string;
  name: string;
  description: string;
  country: string;
  alertLevel: "Green" | "Orange" | "Red" | string;
  severity: string;
  startedAt: string;
  updatedAt: string;
  distanceFromMatnog: number;
  reportUrl: string;
};

type OpenMeteoWeatherResponse = {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  hourly: {
    time: string[];
    precipitation_probability: number[];
    precipitation: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    sunrise: string[];
    sunset: string[];
  };
};

type OpenMeteoMarineResponse = {
  current: {
    time: string;
    wave_height: number;
    wave_direction: number;
    wave_period: number;
    swell_wave_height: number;
    sea_surface_temperature: number;
    ocean_current_velocity: number;
    ocean_current_direction: number;
  };
  daily: {
    wave_height_max: number[];
  };
};

type UsgsResponse = {
  features: {
    id: string;
    properties: {
      mag: number;
      place: string;
      time: number;
      updated: number;
      tsunami: number;
      status: string;
      url: string;
    };
    geometry: { coordinates: [number, number, number] };
  }[];
};

type GdacsResponse = {
  features: {
    properties: {
      eventtype: string;
      eventid: number;
      episodeid: number;
      name: string;
      description: string;
      alertlevel: string;
      country: string;
      fromdate: string;
      datemodified: string;
      affectedcountries?: unknown;
      severitydata?: { severitytext?: string };
      url?: { report?: string };
    };
    geometry: { coordinates: [number, number] };
  }[];
};

const weatherParameters = new URLSearchParams({
  latitude: String(MATNOG_LOCATION.latitude),
  longitude: String(MATNOG_LOCATION.longitude),
  current:
    "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
  hourly: "precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m",
  daily:
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset",
  timezone: "Asia/Manila",
  forecast_days: "7",
});

const marineParameters = new URLSearchParams({
  latitude: String(MATNOG_LOCATION.latitude),
  longitude: String(MATNOG_LOCATION.longitude),
  current:
    "wave_height,wave_direction,wave_period,swell_wave_height,sea_surface_temperature,ocean_current_velocity,ocean_current_direction",
  daily: "wave_height_max,wave_period_max,swell_wave_height_max",
  timezone: "Asia/Manila",
  forecast_days: "7",
  cell_selection: "sea",
});

async function readJson<T>(url: string, source: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${source} returned ${response.status}.`);
  return (await response.json()) as T;
}

function maximum(values: number[]) {
  return values.length ? Math.max(...values.filter(Number.isFinite)) : 0;
}

function sum(values: number[]) {
  return values.filter(Number.isFinite).reduce((total, value) => total + value, 0);
}

function distanceKilometers(latitude: number, longitude: number) {
  const earthRadius = 6371;
  const latitudeDistance = ((latitude - MATNOG_LOCATION.latitude) * Math.PI) / 180;
  const longitudeDistance = ((longitude - MATNOG_LOCATION.longitude) * Math.PI) / 180;
  const left = (MATNOG_LOCATION.latitude * Math.PI) / 180;
  const right = (latitude * Math.PI) / 180;
  const a =
    Math.sin(latitudeDistance / 2) ** 2 + Math.cos(left) * Math.cos(right) * Math.sin(longitudeDistance / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export async function fetchWeatherMonitoring(): Promise<WeatherMonitoring> {
  const data = await readJson<OpenMeteoWeatherResponse>(
    `https://api.open-meteo.com/v1/forecast?${weatherParameters}`,
    "Open-Meteo weather",
  );
  const start = Math.max(
    0,
    data.hourly.time.findIndex((time) => time >= data.current.time),
  );
  const precipitation = data.hourly.precipitation.slice(start, start + 24);
  const precipitationProbability = data.hourly.precipitation_probability.slice(start, start + 24);
  const wind = data.hourly.wind_speed_10m.slice(start, start + 24);
  const gusts = data.hourly.wind_gusts_10m.slice(start, start + 24);
  return {
    current: {
      time: data.current.time,
      temperature: data.current.temperature_2m,
      apparentTemperature: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      precipitation: data.current.precipitation,
      weatherCode: data.current.weather_code,
      cloudCover: data.current.cloud_cover,
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
      windGusts: data.current.wind_gusts_10m,
    },
    daily: data.daily.time.map((date, index) => ({
      date,
      weatherCode: data.daily.weather_code[index],
      temperatureMax: data.daily.temperature_2m_max[index],
      temperatureMin: data.daily.temperature_2m_min[index],
      precipitation: data.daily.precipitation_sum[index],
      precipitationProbability: data.daily.precipitation_probability_max[index],
      windSpeed: data.daily.wind_speed_10m_max[index],
      windGusts: data.daily.wind_gusts_10m_max[index],
      sunrise: data.daily.sunrise[index],
      sunset: data.daily.sunset[index],
    })),
    next24Hours: {
      precipitation: Number(sum(precipitation).toFixed(1)),
      precipitationProbability: maximum(precipitationProbability),
      maximumWind: maximum(wind),
      maximumGust: maximum(gusts),
    },
  };
}

export async function fetchMarineMonitoring(): Promise<MarineMonitoring> {
  const data = await readJson<OpenMeteoMarineResponse>(
    `https://marine-api.open-meteo.com/v1/marine?${marineParameters}`,
    "Open-Meteo marine",
  );
  return {
    time: data.current.time,
    waveHeight: data.current.wave_height,
    waveDirection: data.current.wave_direction,
    wavePeriod: data.current.wave_period,
    swellHeight: data.current.swell_wave_height,
    seaTemperature: data.current.sea_surface_temperature,
    currentVelocity: data.current.ocean_current_velocity,
    currentDirection: data.current.ocean_current_direction,
    sevenDayMaximumWave: maximum(data.daily.wave_height_max),
  };
}

export async function fetchEarthquakeMonitoring(): Promise<EarthquakeEvent[]> {
  const start = new Date();
  start.setDate(start.getDate() - 7);
  const parameters = new URLSearchParams({
    format: "geojson",
    latitude: String(MATNOG_LOCATION.latitude),
    longitude: String(MATNOG_LOCATION.longitude),
    maxradiuskm: "1000",
    minmagnitude: "3",
    starttime: start.toISOString(),
    orderby: "time",
    limit: "25",
  });
  const data = await readJson<UsgsResponse>(
    `https://earthquake.usgs.gov/fdsnws/event/1/query?${parameters}`,
    "USGS earthquake feed",
  );
  return data.features.map((feature) => ({
    id: feature.id,
    magnitude: feature.properties.mag,
    place: feature.properties.place,
    occurredAt: new Date(feature.properties.time).toISOString(),
    updatedAt: new Date(feature.properties.updated).toISOString(),
    depth: feature.geometry.coordinates[2],
    distanceFromMatnog: distanceKilometers(feature.geometry.coordinates[1], feature.geometry.coordinates[0]),
    tsunamiIndicator: feature.properties.tsunami === 1,
    reviewStatus: feature.properties.status,
    url: feature.properties.url,
  }));
}

export async function fetchHazardMonitoring(): Promise<HazardEvent[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  const date = (value: Date) => value.toISOString().slice(0, 10);
  const parameters = new URLSearchParams({
    eventlist: "EQ;TC;FL;VO",
    fromdate: date(start),
    todate: date(end),
    alertlevel: "green;orange;red",
  });
  const data = await readJson<GdacsResponse>(
    `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?${parameters}`,
    "GDACS multi-hazard feed",
  );
  const rank: Record<string, number> = { Red: 3, Orange: 2, Green: 1 };
  return data.features
    .map((feature) => {
      const longitude = feature.geometry.coordinates[0];
      const latitude = feature.geometry.coordinates[1];
      const distanceFromMatnog = distanceKilometers(latitude, longitude);
      const countries = JSON.stringify(feature.properties.affectedcountries ?? "").toLocaleLowerCase();
      const country = feature.properties.country || "Location pending";
      return {
        id: `${feature.properties.eventtype}-${feature.properties.eventid}-${feature.properties.episodeid}`,
        type: feature.properties.eventtype,
        name: feature.properties.name || feature.properties.description,
        description: feature.properties.description,
        country,
        alertLevel: feature.properties.alertlevel,
        severity: feature.properties.severitydata?.severitytext || "Severity information pending",
        startedAt: feature.properties.fromdate,
        updatedAt: feature.properties.datemodified,
        distanceFromMatnog,
        reportUrl: feature.properties.url?.report || "https://www.gdacs.org/",
        nearPhilippines:
          distanceFromMatnog <= 1800 ||
          country.toLocaleLowerCase().includes("philipp") ||
          countries.includes("philipp") ||
          countries.includes("phl"),
      };
    })
    .filter((event) => event.nearPhilippines)
    .sort((left, right) => {
      const alertOrder = (rank[right.alertLevel] ?? 0) - (rank[left.alertLevel] ?? 0);
      return alertOrder || new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    })
    .slice(0, 12)
    .map(({ nearPhilippines: _, ...event }) => event);
}

export function weatherCondition(code: number) {
  if (code === 0) return "Clear sky";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([85, 86].includes(code)) return "Snow showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Weather condition pending";
}

export function compassDirection(degrees: number) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(degrees / 45) % 8];
}
