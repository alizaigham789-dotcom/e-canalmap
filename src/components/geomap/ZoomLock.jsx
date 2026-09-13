import { useEffect } from "react";
import { useMap } from "react-leaflet";

// Locks the map screen while a khal/moga draw or edit tool is active — no zoom
// (scroll, pinch, double-click, box, keyboard) so drawing/editing stays stable.
export default function ZoomLock({ active }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (active) {
      map.scrollWheelZoom.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    } else {
      map.scrollWheelZoom.enable();
      map.touchZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    }
  }, [map, active]);
  return null;
}