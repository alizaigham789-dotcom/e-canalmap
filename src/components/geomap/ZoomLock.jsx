import { useEffect } from "react";
import { useMap } from "react-leaflet";

// Keeps mouse-wheel zoom available while preventing pinch / double-click / box
// zoom, which would interfere with tap-and-double-click drawing gestures.
export default function ZoomLock({ active }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (active) {
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
    } else {
      map.touchZoom.enable();
      map.boxZoom.enable();
    }
  }, [map, active]);
  return null;
}