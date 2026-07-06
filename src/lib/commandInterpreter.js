import {
  createMustateel, createChakbandi, createMouza,
  createCanal, createKhal, createRoad, createOutlet,
  DIMENSIONS,
} from "@/lib/gisEngine";

/**
 * Interpret structured AI commands into actual map objects.
 * @param {Array} commands - parsed command objects from LLM
 * @param {Array} existingObjects - current objects on the canvas
 * @returns {{ newObjects: Array, updates: Array<{id, changes}> }}
 */
export function interpretCommands(commands, existingObjects = []) {
  const newObjects = [];
  const updates = [];

  // Combined view: existing + newly created in this batch
  const getAll = (type) => [
    ...existingObjects.filter(o => o.type === type),
    ...newObjects.filter(o => o.type === type),
  ];

  const boundsOf = (musts) => {
    const minX = Math.min(...musts.map(m => m.x));
    const minY = Math.min(...musts.map(m => m.y));
    const maxX = Math.max(...musts.map(m => m.x + m.w));
    const maxY = Math.max(...musts.map(m => m.y + m.h));
    return { minX, minY, maxX, maxY };
  };

  for (const cmd of commands) {
    switch (cmd.action) {
      // ─── CREATE MUSTATEELS (numbered grid) ──────────────────────────────
      case "create_mustateels": {
        const start = parseInt(cmd.start, 10);
        const end = parseInt(cmd.end, 10);
        if (isNaN(start) || isNaN(end) || end < start) break;
        const count = end - start + 1;
        const cols = Math.ceil(Math.sqrt(count));
        const w = DIMENSIONS.MUSTATEEL.width;
        const h = DIMENSIONS.MUSTATEEL.height;
        const existingMust = getAll("mustateel");
        let baseX = 200, baseY = 200;
        if (existingMust.length > 0) {
          const b = boundsOf(existingMust);
          baseX = b.maxX + 100;
          baseY = b.minY;
        }
        for (let i = 0; i < count; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const obj = createMustateel(baseX + col * w, baseY + row * h);
          obj.label = String(start + i);
          if (cmd.mogaNumber) obj.mogaNumber = String(cmd.mogaNumber);
          newObjects.push(obj);
        }
        break;
      }

      // ─── DRAW CHAKBANDI (boundary cross-marks around mustateels) ─────────
      case "draw_chakbandi": {
        const musts = getAll("mustateel");
        if (musts.length === 0) break;
        const { minX, minY, maxX, maxY } = boundsOf(musts);
        const points = [
          { x: minX, y: minY }, { x: maxX, y: minY },
          { x: maxX, y: maxY }, { x: minX, y: maxY },
          { x: minX, y: minY },
        ];
        const ch = createChakbandi(points);
        if (cmd.mogaNumber) ch.mogaNumber = String(cmd.mogaNumber);
        if (cmd.name) ch.name = cmd.name;
        newObjects.push(ch);
        break;
      }

      // ─── DRAW MOUZA (village boundary around mustateels) ────────────────
      case "draw_mouza": {
        const musts = getAll("mustateel");
        if (musts.length === 0) break;
        const pad = 150;
        const { minX, minY, maxX, maxY } = boundsOf(musts);
        const points = [
          { x: minX - pad, y: minY - pad }, { x: maxX + pad, y: minY - pad },
          { x: maxX + pad, y: maxY + pad }, { x: minX - pad, y: maxY + pad },
          { x: minX - pad, y: minY - pad },
        ];
        newObjects.push(createMouza(points));
        break;
      }

      // ─── DRAW CANAL ─────────────────────────────────────────────────────
      case "draw_canal": {
        const musts = getAll("mustateel");
        if (musts.length === 0) break;
        const { minX, minY, maxX, maxY } = boundsOf(musts);
        const dir = cmd.direction || "horizontal";
        const pos = cmd.position || "top";
        let points;
        if (dir === "vertical") {
          const x = pos === "left" ? minX - 120 : maxX + 120;
          points = [{ x, y: minY - 200 }, { x, y: maxY + 200 }];
        } else {
          const y = pos === "bottom" ? maxY + 120 : minY - 120;
          points = [{ x: minX - 200, y }, { x: maxX + 200, y }];
        }
        const canal = createCanal(points);
        if (cmd.name) canal.name = cmd.name;
        newObjects.push(canal);
        break;
      }

      // ─── DRAW KHAL (minor canal) ────────────────────────────────────────
      case "draw_khal": {
        const musts = getAll("mustateel");
        if (musts.length === 0) break;
        const { minX, minY, maxX, maxY } = boundsOf(musts);
        const pos = cmd.position || "top";
        const y = pos === "bottom" ? maxY + 80 : minY - 80;
        newObjects.push(createKhal([{ x: minX - 100, y }, { x: maxX + 100, y }]));
        break;
      }

      // ─── DRAW ROAD ──────────────────────────────────────────────────────
      case "draw_road": {
        const musts = getAll("mustateel");
        if (musts.length === 0) break;
        const { minX, minY, maxX, maxY } = boundsOf(musts);
        const pos = cmd.position || "bottom";
        const y = pos === "bottom" ? maxY + 250 : minY - 250;
        newObjects.push(createRoad([{ x: minX - 200, y }, { x: maxX + 200, y }]));
        break;
      }

      // ─── PLACE MOGA / OUTLET on canal ───────────────────────────────────
      case "place_moga": {
        const canals = getAll("canal");
        if (canals.length === 0) break;
        const canal = canals[canals.length - 1];
        const midIdx = Math.floor(canal.points.length / 2);
        const p1 = canal.points[midIdx - 1] || canal.points[0];
        const p2 = canal.points[midIdx] || canal.points[canal.points.length - 1];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy) || 1;
        // Perpendicular — points toward mustateels
        const musts = getAll("mustateel");
        let perpX = -dy / len * 150;
        let perpY = dx / len * 150;
        if (musts.length > 0) {
          const { minX, minY, maxX, maxY } = boundsOf(musts);
          const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
          // Flip perpendicular if pointing away from mustateels
          if ((midX + perpX - cx) ** 2 + (midY + perpY - cy) ** 2 >
              (midX - perpX - cx) ** 2 + (midY - perpY - cy) ** 2) {
            perpX = -perpX; perpY = -perpY;
          }
        }
        const outlet = createOutlet(canal.id, { x: midX, y: midY }, { x: midX + perpX, y: midY + perpY });
        outlet.mogha_number = String(cmd.number || "");
        outlet.mogha_side = cmd.side || "R";
        newObjects.push(outlet);
        break;
      }

      // ─── LABEL ACRES on a specific mustateel ────────────────────────────
      case "label_acres": {
        const num = String(cmd.mustateelNumber);
        const must = [...existingObjects, ...newObjects].find(m => m.type === "mustateel" && m.label === num);
        if (must) {
          const labelParts = [cmd.acres ? String(cmd.acres) : ""];
          if (cmd.outOfMouza) labelParts.push(`(${cmd.outOfMouza} out)`);
          updates.push({ id: must.id, changes: { centerLabel: labelParts.filter(Boolean).join(" ") } });
        }
        break;
      }

      default:
        break;
    }
  }

  return { newObjects, updates };
}