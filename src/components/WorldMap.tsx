import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Pin } from "@/types/travel";

const createPinIcon = (type: "visited" | "wishlist") => {
  const color = type === "visited" ? "#c2703a" : "#5a8ab5";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.268 21.732 0 14 0z" fill="${color}"/>
      <circle cx="14" cy="13" r="6" fill="white" opacity="0.9"/>
      <circle cx="14" cy="13" r="3" fill="${color}"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: type === "visited" ? "custom-pin-visited" : "custom-pin-wishlist",
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -40],
  });
};

interface WorldMapProps {
  pins: Pin[];
  onPinClick: (pin: Pin) => void;
}

const WorldMap = ({ pins, onPinClick }: WorldMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 10],
      zoom: 3,
      minZoom: 2,
      maxZoom: 12,
      scrollWheelZoom: true,
      attributionControl: false,
      worldCopyJump: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png").addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png", {
      pane: "tooltipPane",
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add pins
    pins.forEach((pin) => {
      const marker = L.marker([pin.lat, pin.lng], {
        icon: createPinIcon(pin.type),
      }).addTo(map);

      marker.bindPopup(
        `<div style="font-family: Inter, sans-serif; font-size: 13px;">
          <p style="font-weight: 600; margin: 0;">${pin.name}</p>
          <p style="color: #888; margin: 2px 0 0; font-size: 11px;">${pin.country}</p>
        </div>`,
        { className: "custom-popup" }
      );

      marker.on("click", () => onPinClick(pin));
    });
  }, [pins, onPinClick]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default WorldMap;
