import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Link } from "react-router-dom";

import type { MapPoint } from "@/lib/api";

const WORLD_CENTER: L.LatLngTuple = [20, 0];
const WORLD_ZOOM = 2;
const FIT_PADDING: L.PointTuple = [32, 32];
const FIT_MAX_ZOOM = 12;

const markerIcon = L.divIcon({
  className: "",
  html: '<span class="block h-4 w-4 rounded-full border-2 border-background bg-primary shadow-md"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8],
});

function clusterIcon(cluster: { getChildCount: () => number }) {
  return L.divIcon({
    className: "",
    html: `<span class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary text-sm font-medium text-primary-foreground shadow-md">${cluster.getChildCount()}</span>`,
    iconSize: [36, 36],
  });
}

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as L.LatLngTuple)), {
      padding: FIT_PADDING,
      maxZoom: FIT_MAX_ZOOM,
    });
  }, [map, points]);

  return null;
}

export default function IncidentMap({ points }: { points: MapPoint[] }) {
  return (
    <MapContainer
      center={WORLD_CENTER}
      zoom={WORLD_ZOOM}
      worldCopyJump
      className="h-full w-full bg-muted [&_.leaflet-popup-content-wrapper]:bg-popover [&_.leaflet-popup-content-wrapper]:text-popover-foreground [&_.leaflet-popup-tip]:bg-popover"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="dark:invert dark:hue-rotate-180 dark:brightness-90 dark:contrast-90"
      />
      <MarkerClusterGroup chunkedLoading iconCreateFunction={clusterIcon}>
        {points.map((point) => (
          <Marker key={point.id} position={[point.latitude, point.longitude]} icon={markerIcon}>
            <Popup>
              <div className="flex min-w-40 flex-col gap-1">
                <span className="font-medium">{point.title}</span>
                {point.year !== null && <span className="text-muted-foreground">{point.year}</span>}
                <Link
                  to={`/incidents/${point.id}`}
                  className="cursor-pointer text-primary underline underline-offset-4"
                >
                  View incident
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
      <FitBounds points={points} />
    </MapContainer>
  );
}
