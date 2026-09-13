import { useEffect } from "react";
import { useMap } from "react-leaflet";

// Disables all map zoom interactions (scroll, pinch, double-click, box, keyboard)
// while a drawing tool is active, so the screen stays fixed while drawing.
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
      // doubleClickZoom stays disabled globally (dblclick finishes drawing)
    }
  }, [map, active]);
  return null;
}