"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CloudRain,
  Compass,
  ExternalLink,
  Gauge,
  MapPinned,
  Radio,
  RefreshCw,
  ShieldAlert,
  ThermometerSun,
  Waves,
  Wind,
} from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import {
  compassDirection,
  type EarthquakeEvent,
  fetchEarthquakeMonitoring,
  fetchHazardMonitoring,
  fetchMarineMonitoring,
  fetchWeatherMonitoring,
  type HazardEvent,
  MATNOG_LOCATION,
  type MarineMonitoring,
  type WeatherMonitoring,
  weatherCondition,
} from "../services/hazard-monitoring-service";

type SourceKey = "weather" | "marine" | "earthquakes" | "hazards";
type SourceState = Record<SourceKey, { state: "loading" | "connected" | "error"; message: string }>;

const SOURCE_NAMES: Record<SourceKey, string> = {
  weather: "Open-Meteo Weather",
  marine: "Open-Meteo Marine",
  earthquakes: "USGS Earthquakes",
  hazards: "GDACS Hazards",
};

const initialSources: SourceState = {
  weather: { state: "loading", message: "Connecting" },
  marine: { state: "loading", message: "Connecting" },
  earthquakes: { state: "loading", message: "Connecting" },
  hazards: { state: "loading", message: "Connecting" },
};

const hazardLabels: Record<string, string> = {
  EQ: "Earthquake",
  TC: "Tropical cyclone",
  FL: "Flood",
  VO: "Volcanic activity",
};

function number(value: number | undefined, digits = 0) {
  return value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function day(value: string) {
  return new Intl.DateTimeFormat("en-PH", { weekday: "short", month: "short", day: "numeric" }).format(
    new Date(`${value}T12:00:00+08:00`),
  );
}

function sourceTone(state: SourceState[SourceKey]["state"]): StatusTone {
  if (state === "connected") return "success";
  if (state === "error") return "destructive";
  return "pending";
}

function alertTone(level: string): StatusTone {
  if (level === "Red") return "destructive";
  if (level === "Orange") return "warning";
  return "success";
}

function SourceError({ source, message }: { source: string; message: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-xl border border-destructive/25 bg-destructive/[.035] p-6 text-center">
      <div>
        <AlertTriangle className="mx-auto text-destructive" size={24} />
        <strong className="mt-3 block">{source} is unavailable</strong>
        <p className="mt-1 text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  );
}

function SourceLoading({ source }: { source: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-xl border bg-muted/20 p-6 text-center">
      <div>
        <RefreshCw className="mx-auto animate-spin text-primary" size={24} />
        <strong className="mt-3 block">Connecting to {source}</strong>
        <p className="mt-1 text-muted-foreground text-sm">Waiting for the latest available observation.</p>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Wind;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border bg-muted/20 p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
        <strong className="mt-1 block text-lg">{value}</strong>
        <small className="text-muted-foreground">{detail}</small>
      </div>
    </div>
  );
}

function activityLink(event: EarthquakeEvent | HazardEvent) {
  if ("magnitude" in event) {
    const priority = event.magnitude >= 6 ? "Critical" : event.magnitude >= 5 ? "High" : "Moderate";
    const values = new URLSearchParams({
      type: event.tsunamiIndicator ? "Tsunami" : "Earthquake",
      name: `Earthquake monitoring — ${event.place}`,
      priority,
      reference: event.id.toUpperCase(),
      summary: `Monitor the M${event.magnitude.toFixed(1)} earthquake ${event.distanceFromMatnog} km from Matnog at a depth of ${event.depth.toFixed(1)} km.`,
    });
    return `/ops/disaster/events/new?${values}`;
  }
  const type =
    event.type === "TC"
      ? "Typhoon"
      : event.type === "FL"
        ? "Flood"
        : event.type === "VO"
          ? "Volcanic activity"
          : "Earthquake";
  const priority = event.alertLevel === "Red" ? "Critical" : event.alertLevel === "Orange" ? "High" : "Moderate";
  const values = new URLSearchParams({
    type,
    name: `${hazardLabels[event.type] ?? "Hazard"} monitoring — ${event.name}`,
    priority,
    reference: event.id,
    summary: `${event.description}. ${event.severity}. Source: GDACS.`,
  });
  return `/ops/disaster/events/new?${values}`;
}

export function HazardMonitoringView() {
  const { role } = useWorkspaceSession();
  const [weather, setWeather] = useState<WeatherMonitoring>();
  const [marine, setMarine] = useState<MarineMonitoring>();
  const [earthquakes, setEarthquakes] = useState<EarthquakeEvent[]>([]);
  const [hazards, setHazards] = useState<HazardEvent[]>([]);
  const [sources, setSources] = useState<SourceState>(initialSources);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>();

  const load = useCallback(async () => {
    setRefreshing(true);
    setSources(
      (current) =>
        Object.fromEntries(
          Object.entries(current).map(([key, value]) => [key, { ...value, state: "loading", message: "Refreshing" }]),
        ) as SourceState,
    );
    const connect = async <T,>(key: SourceKey, request: () => Promise<T>, receive: (value: T) => void) => {
      try {
        const value = await request();
        receive(value);
        setSources((current) => ({
          ...current,
          [key]: { state: "connected", message: "Live data received" },
        }));
      } catch (error) {
        setSources((current) => ({
          ...current,
          [key]: {
            state: "error",
            message: error instanceof Error ? error.message : "Connection failed",
          },
        }));
      }
    };

    await Promise.allSettled([
      connect("weather", fetchWeatherMonitoring, setWeather),
      connect("marine", fetchMarineMonitoring, setMarine),
      connect("earthquakes", fetchEarthquakeMonitoring, setEarthquakes),
      connect("hazards", fetchHazardMonitoring, setHazards),
    ]);
    setLastUpdated(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 10 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [load]);

  if (role !== "municipal" && role !== "barangay") {
    return (
      <PermissionState
        title="Hazard monitoring is not assigned to this role"
        description="Choose the municipal or barangay role to open the MDRRMO monitoring workspace."
      />
    );
  }

  const tsunamiEvents = earthquakes.filter((event) => event.tsunamiIndicator);
  const strongestEarthquake = earthquakes.reduce<EarthquakeEvent | undefined>(
    (strongest, event) => (!strongest || event.magnitude > strongest.magnitude ? event : strongest),
    undefined,
  );
  const sourceErrors = Object.values(sources).filter((source) => source.state === "error").length;
  const sourcesLoading = Object.values(sources).some((source) => source.state === "loading");

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Monitoring</h1>
          <p>Live weather, marine, seismic, tsunami-related, and multi-hazard awareness for Matnog, Sorsogon.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/ops/disaster/events/new">
              <Activity /> New activity
            </Link>
          </Button>
          <Button onClick={() => void load()} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : undefined} />
            {refreshing ? "Refreshing" : "Refresh data"}
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={sourcesLoading ? "pending" : sourceErrors ? "warning" : "success"}>
            {sourcesLoading
              ? "Refreshing live sources"
              : sourceErrors
                ? `${sourceErrors} source${sourceErrors === 1 ? "" : "s"} unavailable`
                : "Live sources connected"}
          </StatusBadge>
          <span className="text-muted-foreground text-sm">
            <MapPinned className="mr-1 inline" size={14} /> {MATNOG_LOCATION.name} ·{" "}
            {MATNOG_LOCATION.latitude.toFixed(4)}, {MATNOG_LOCATION.longitude.toFixed(4)}
          </span>
        </div>
        <span className="text-muted-foreground text-sm">
          Updated {lastUpdated ? dateTime(lastUpdated.toISOString()) : "when source data arrives"} · refreshes every 10
          minutes
        </span>
      </div>

      <section className="treasury-summary-grid" aria-label="Current hazard monitoring summary">
        <div className="treasury-summary-card">
          <div className="treasury-summary-heading">
            <span>Current weather</span>
            <ThermometerSun size={17} />
          </div>
          <div className="treasury-summary-line">
            <strong>{weather ? `${number(weather.current.temperature, 1)}°C` : "—"}</strong>
            <small>{weather ? weatherCondition(weather.current.weatherCode) : sources.weather.message}</small>
          </div>
        </div>
        <div className="treasury-summary-card">
          <div className="treasury-summary-heading">
            <span>Rainfall · next 24 hours</span>
            <CloudRain size={17} />
          </div>
          <div className="treasury-summary-line">
            <strong>{weather ? `${number(weather.next24Hours.precipitation, 1)} mm` : "—"}</strong>
            <small>
              {weather
                ? `${number(weather.next24Hours.precipitationProbability)}% maximum probability`
                : sources.weather.message}
            </small>
          </div>
        </div>
        <div className="treasury-summary-card">
          <div className="treasury-summary-heading">
            <span>Coastal conditions</span>
            <Waves size={17} />
          </div>
          <div className="treasury-summary-line">
            <strong>{marine ? `${number(marine.waveHeight, 2)} m` : "—"}</strong>
            <small>{marine ? `${number(marine.wavePeriod, 1)} sec wave period` : sources.marine.message}</small>
          </div>
        </div>
        <div className="treasury-summary-card">
          <div className="treasury-summary-heading">
            <span>Seismic · past 7 days</span>
            <Radio size={17} />
          </div>
          <div className="treasury-summary-line">
            <strong>{earthquakes.length}</strong>
            <small>
              {strongestEarthquake
                ? `strongest M${strongestEarthquake.magnitude.toFixed(1)} within 1,000 km`
                : sources.earthquakes.message}
            </small>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,.7fr)]">
        <ContentPanel as="section" className="overflow-hidden p-0">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b p-5">
            <div>
              <span className="eyebrow">Interactive forecast map</span>
              <h2 className="!mb-0">Wind, rain, clouds, and pressure</h2>
            </div>
            <Button asChild variant="outline" size="sm">
              <a href="https://www.windy.com/12.586/124.086" target="_blank" rel="noreferrer">
                Open Windy <ExternalLink />
              </a>
            </Button>
          </div>
          <iframe
            className="block h-[560px] w-full border-0"
            title="Interactive Windy forecast map centered on Matnog, Sorsogon"
            src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km%2Fh&zoom=7&overlay=wind&product=ecmwf&level=surface&lat=12.586&lon=124.086&detail=true&detailLat=12.586&detailLon=124.086&marker=true&calendar=now&pressure=true"
            allowFullScreen
          />
        </ContentPanel>

        <div className="grid content-start gap-6">
          <ContentPanel as="section" className="!mb-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="eyebrow">Local conditions</span>
                <h2>Matnog weather</h2>
              </div>
              <StatusBadge tone={sourceTone(sources.weather.state)}>{sources.weather.state}</StatusBadge>
            </div>
            {weather ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Metric
                  icon={ThermometerSun}
                  label="Feels like"
                  value={`${number(weather.current.apparentTemperature, 1)}°C`}
                  detail={`${number(weather.current.humidity)}% humidity`}
                />
                <Metric
                  icon={Wind}
                  label="Wind"
                  value={`${number(weather.current.windSpeed, 1)} km/h`}
                  detail={`${compassDirection(weather.current.windDirection)} · gusts ${number(weather.current.windGusts, 1)} km/h`}
                />
                <Metric
                  icon={CloudRain}
                  label="Current rain"
                  value={`${number(weather.current.precipitation, 1)} mm`}
                  detail={`${number(weather.current.cloudCover)}% cloud cover`}
                />
                <Metric
                  icon={Gauge}
                  label="24-hour gust"
                  value={`${number(weather.next24Hours.maximumGust, 1)} km/h`}
                  detail={`${number(weather.next24Hours.maximumWind, 1)} km/h sustained maximum`}
                />
              </div>
            ) : sources.weather.state === "error" ? (
              <SourceError source={SOURCE_NAMES.weather} message={sources.weather.message} />
            ) : (
              <SourceLoading source={SOURCE_NAMES.weather} />
            )}
          </ContentPanel>

          <ContentPanel as="section" className="!mb-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="eyebrow">Coastal observation</span>
                <h2>Marine conditions</h2>
              </div>
              <StatusBadge tone={sourceTone(sources.marine.state)}>{sources.marine.state}</StatusBadge>
            </div>
            {marine ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Metric
                  icon={Waves}
                  label="Wave height"
                  value={`${number(marine.waveHeight, 2)} m`}
                  detail={`${compassDirection(marine.waveDirection)} · ${number(marine.wavePeriod, 1)} sec period`}
                />
                <Metric
                  icon={Compass}
                  label="Ocean current"
                  value={`${number(marine.currentVelocity, 1)} km/h`}
                  detail={`${compassDirection(marine.currentDirection)} direction`}
                />
                <Metric
                  icon={Waves}
                  label="Swell"
                  value={`${number(marine.swellHeight, 2)} m`}
                  detail={`${number(marine.sevenDayMaximumWave, 2)} m seven-day maximum`}
                />
                <Metric
                  icon={ThermometerSun}
                  label="Sea temperature"
                  value={`${number(marine.seaTemperature, 1)}°C`}
                  detail="Modelled coastal grid value"
                />
              </div>
            ) : sources.marine.state === "error" ? (
              <SourceError source={SOURCE_NAMES.marine} message={sources.marine.message} />
            ) : (
              <SourceLoading source={SOURCE_NAMES.marine} />
            )}
          </ContentPanel>
        </div>
      </div>

      <ContentPanel as="section" className="mt-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="eyebrow">Seven-day outlook</span>
            <h2>Matnog forecast</h2>
          </div>
          <span className="text-muted-foreground text-sm">Open-Meteo · Asia/Manila</span>
        </div>
        {weather ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
            {weather.daily.map((forecast) => (
              <article className="rounded-xl border bg-muted/20 p-4" key={forecast.date}>
                <strong>{day(forecast.date)}</strong>
                <p className="mt-2 font-semibold text-primary text-sm">{weatherCondition(forecast.weatherCode)}</p>
                <div className="mt-3 flex items-end gap-1">
                  <span className="font-bold text-2xl">{number(forecast.temperatureMax)}°</span>
                  <span className="pb-1 text-muted-foreground text-sm">/ {number(forecast.temperatureMin)}°</span>
                </div>
                <dl className="mt-3 grid gap-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Rain</dt>
                    <dd className="font-semibold">{number(forecast.precipitation, 1)} mm</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Chance</dt>
                    <dd className="font-semibold">{number(forecast.precipitationProbability)}%</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Gusts</dt>
                    <dd className="font-semibold">{number(forecast.windGusts)} km/h</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : sources.weather.state === "error" ? (
          <SourceError source={SOURCE_NAMES.weather} message={sources.weather.message} />
        ) : (
          <SourceLoading source={SOURCE_NAMES.weather} />
        )}
      </ContentPanel>

      <div className="grid gap-6 xl:grid-cols-2">
        <ContentPanel as="section" className="!mb-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">Earthquake awareness</span>
              <h2>Recent seismic activity</h2>
              <p className="text-muted-foreground text-sm">
                Magnitude 3.0+ events within 1,000 km during the past seven days.
              </p>
            </div>
            <StatusBadge tone={sourceTone(sources.earthquakes.state)}>{sources.earthquakes.state}</StatusBadge>
          </div>
          {sources.earthquakes.state === "loading" && !earthquakes.length ? (
            <SourceLoading source={SOURCE_NAMES.earthquakes} />
          ) : sources.earthquakes.state === "error" && !earthquakes.length ? (
            <SourceError source={SOURCE_NAMES.earthquakes} message={sources.earthquakes.message} />
          ) : earthquakes.length ? (
            <div className="mt-5 grid gap-3">
              {earthquakes.slice(0, 8).map((event) => (
                <article
                  className="flex flex-wrap items-start justify-between gap-4 rounded-xl border p-4"
                  key={event.id}
                >
                  <div className="flex min-w-0 gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 font-bold text-primary">
                      M{event.magnitude.toFixed(1)}
                    </span>
                    <div className="min-w-0">
                      <strong className="block">{event.place}</strong>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {event.distanceFromMatnog.toLocaleString()} km from Matnog · {number(event.depth, 1)} km depth ·{" "}
                        {dateTime(event.occurredAt)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {event.tsunamiIndicator && <StatusBadge tone="warning">USGS tsunami indicator</StatusBadge>}
                        <StatusBadge tone="neutral">{event.reviewStatus}</StatusBadge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open USGS event for ${event.place}`}
                      >
                        <ExternalLink />
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={activityLink(event)}>
                        <Activity /> Create activity
                      </Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border bg-muted/20 p-6 text-center">
              <ShieldAlert className="mx-auto text-primary" size={24} />
              <strong className="mt-3 block">No matching earthquake in the current feed</strong>
              <p className="mt-1 text-muted-foreground text-sm">
                USGS returned no magnitude 3.0+ event within the selected area and period.
              </p>
            </div>
          )}
        </ContentPanel>

        <ContentPanel as="section" className="!mb-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">Regional multi-hazard awareness</span>
              <h2>Active hazard events</h2>
              <p className="text-muted-foreground text-sm">
                Current GDACS events affecting or located within 1,800 km of Matnog.
              </p>
            </div>
            <StatusBadge tone={sourceTone(sources.hazards.state)}>{sources.hazards.state}</StatusBadge>
          </div>
          {sources.hazards.state === "loading" && !hazards.length ? (
            <SourceLoading source={SOURCE_NAMES.hazards} />
          ) : sources.hazards.state === "error" && !hazards.length ? (
            <SourceError source={SOURCE_NAMES.hazards} message={sources.hazards.message} />
          ) : hazards.length ? (
            <div className="mt-5 grid gap-3">
              {hazards.slice(0, 8).map((event) => (
                <article className="rounded-xl border p-4" key={event.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={alertTone(event.alertLevel)}>{event.alertLevel}</StatusBadge>
                        <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                          {hazardLabels[event.type] ?? event.type}
                        </span>
                      </div>
                      <strong className="mt-2 block">{event.name}</strong>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {event.country} · {event.distanceFromMatnog.toLocaleString()} km from Matnog
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <a
                          href={event.reportUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open GDACS report for ${event.name}`}
                        >
                          <ExternalLink />
                        </a>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={activityLink(event)}>
                          <Activity /> Create activity
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm">{event.severity}</p>
                  <p className="mt-2 text-muted-foreground text-xs">Updated {dateTime(event.updatedAt)}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border bg-muted/20 p-6 text-center">
              <ShieldAlert className="mx-auto text-primary" size={24} />
              <strong className="mt-3 block">No regional event in the current feed</strong>
              <p className="mt-1 text-muted-foreground text-sm">
                GDACS returned no event matching the Matnog regional boundary.
              </p>
            </div>
          )}
        </ContentPanel>
      </div>

      <ContentPanel as="section" className="mt-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,.7fr)]">
          <div>
            <span className="eyebrow">Tsunami monitoring</span>
            <h2>Verify official Philippine bulletins</h2>
            <div className="mt-4 flex gap-3 rounded-xl border bg-primary/[.035] p-4">
              <ShieldAlert className="mt-0.5 shrink-0 text-primary" size={21} />
              <div>
                <strong>
                  {tsunamiEvents.length
                    ? `${tsunamiEvents.length} USGS event${tsunamiEvents.length === 1 ? "" : "s"} carried a tsunami indicator.`
                    : "No USGS event in the current regional feed carries a tsunami indicator."}
                </strong>
                <p className="mt-1 text-muted-foreground text-sm">
                  The USGS indicator is an awareness signal. Evacuation and public-warning decisions must use the latest
                  DOST-PHIVOLCS bulletin and local MDRRMO validation.
                </p>
              </div>
            </div>
          </div>
          <div className="grid content-start gap-2">
            <Button asChild>
              <a href="https://tsunami.phivolcs.dost.gov.ph/" target="_blank" rel="noreferrer">
                Open PHIVOLCS tsunami bulletins <ArrowUpRight />
              </a>
            </Button>
            <Button asChild variant="outline">
              <a
                href="https://bagong.pagasa.dost.gov.ph/tropical-cyclone-bulletin-iframe"
                target="_blank"
                rel="noreferrer"
              >
                Open PAGASA cyclone bulletins <ArrowUpRight />
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="https://ndrrmc.gov.ph/index.php/8-ndrrmc-update" target="_blank" rel="noreferrer">
                Open NDRRMC updates <ArrowUpRight />
              </a>
            </Button>
          </div>
        </div>
      </ContentPanel>

      <ContentPanel as="section">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="eyebrow">Source accountability</span>
            <h2>Live data connections</h2>
            <p className="text-muted-foreground text-sm">
              Each source reports independently so a temporary outage does not hide available hazard information.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-muted-foreground text-sm">
            <CalendarDays size={15} /> Automatic refresh every 10 minutes
          </span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(sources) as SourceKey[]).map((key) => (
            <div className="rounded-xl border p-4" key={key}>
              <div className="flex items-center justify-between gap-2">
                <strong>{SOURCE_NAMES[key]}</strong>
                <StatusBadge tone={sourceTone(sources[key].state)}>{sources[key].state}</StatusBadge>
              </div>
              <p className="mt-2 text-muted-foreground text-sm">{sources[key].message}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 border-t pt-4 text-muted-foreground text-xs">
          Weather and marine forecasts: Open-Meteo with source-model attribution. Earthquake data: U.S. Geological
          Survey. Multi-hazard event data: Global Disaster Alert and Coordination System (GDACS). Interactive map:
          Windy. Marine forecasts are model guidance and are not suitable for navigation.
        </p>
      </ContentPanel>
    </>
  );
}
