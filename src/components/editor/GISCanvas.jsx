import React, { useRef, useEffect, useLayoutEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  screenToWorld, worldToScreen, hitTest,
  snapToAcreGrid, snapToMustateeelGrid, snapToMurabaGrid,
  snapMovePosition, snapToParcelBoundaries, isInViewport,
  DIMENSIONS, distToLineSegment, computeSnapPosition,
  snapToNearestBoundary, rectsOverlap, createMustateel, createMuraba, createAcre,
  getMustateelMouzaSplit, getObjectsInBox, nearestPointOnPolyline,
  calculateChakbandiGCA, mogaNumberFont,
} from "@/lib/gisEngine";
import { drawCCAGCAFractionBoxOnCanvas, getOutletLabelPos, getChakbandiLabelPos, getCCAGCAText } from "@/lib/printRenderHelpers";
import { applyOrthoConstraint, segmentAngleDeg, findNearbyEndpoint, isLineTool } from "@/lib/drawingAssist";
import {
  drawGrid, drawAcre, drawMustateel, drawMuraba,
  drawCanal, drawKhal, drawRoad, drawBridge, drawOutlet, drawChakbandi, drawMouza, drawDamageMarker,
  drawCanalDraft, drawKhalDraft, drawRoadDraft, drawBridgeDraft, drawChakbandiDraft, drawMouzaDraft, drawOutletDraft,
} from "@/components/editor/GISRenderer";

const GISCanvas = forwardRef(function GISCanvas(
  {
    objects, activeTool, zoom, pan, layers,
    selectedId, onSelect, onAddObject, onUpdateObject,
    canalDraft, onCanalPointAdd, onCanalFinish,
    chakbandiDraft, onChakbandiPointAdd, onChakbandiFinish,
    outletDraft, onOutletStart, onOutletFinish,
    khalDraft, onKhalPointAdd, onKhalFinish,
    roadDraft, onRoadPointAdd, onRoadFinish,
    bridgeDraft, onBridgePointAdd, onBridgeFinish,
    mouzaDraft, onMouzaPointAdd, onMouzaFinish,
    snapPos, onSnapPosChange, onPanChange, onZoomChange,
    colorSettings, bgColor, snapSettings,
    onDamageMarkerClick,
    freehandMode, // if true: chakbandi/mouza follow mouse without click-per-point
    gridFlags, // { showMustateel, showMuraba }
    killaVisibility, // { mustateel: bool, muraba: bool }
    orthoMode, // CAD-style H/V angle constraint while drawing line tools
    onBoxSelect, // callback(selectedObjects[]) when box-select completes
    onBulkUpdate, // bulk update multiple objects in one history snapshot (group move)
    pageBorderStyle, // "none"|"dashed"|"solid"|"dotted" — page border guide
    deleteVertexMode, // when true: clicking a vertex deletes it (explicit node removal)
  },
  ref
) {
  const canvasRef = useRef(null);
  const isPanning = useRef(false);
  const isMoving = useRef(false);
  const movingObjId = useRef(null);
  const moveOffset = useRef({ x: 0, y: 0 });
  const movingObjOrigPoints = useRef(null);
  // Originals of chakbandis + outlets attached to a canal being dragged — captured
  // at drag start so elastic hook joints + stuck mogas move by the exact delta (no drift).
  const attachedOrigRef = useRef(null);
  const movingObjOrigStartEnd = useRef(null); // { start, end } — for outlet/moga dragging
  const movingGroupRef = useRef(null); // { groupId, originals } — whole moga group drag (merged maps)
  const vertexDrag = useRef(null); // { id, index } — dragging a single vertex of the selected chakbandi/canal
  const movingLabelType = useRef(null); // "outlet" | "chakbandi" — dragging a label box
  const lastMouse = useRef({ x: 0, y: 0 });
  const longPressTimer = useRef(null);
  const touchMoved = useRef(false);
  const animRef = useRef(null);
  const objectsRef = useRef(objects);
  objectsRef.current = objects;
  const panRef = useRef(pan);
  panRef.current = pan;
  const edgePanRef = useRef({ active: false, dx: 0, dy: 0 });
  const [editingLabel, setEditingLabel] = useState(null);
  // Damage marker line drawing state
  const damageStartRef = useRef(null);
  const [damageDraft, setDamageDraft] = useState(null);
  // Mustateel/muraba ghost preview
  const [ghostPos, setGhostPos] = useState(null);
  // Polygon measurement tool state — multi-point area + perimeter
  const [measurePoly, setMeasurePoly] = useState(null); // [{x,y}, ...]
  const [measureResult, setMeasureResult] = useState(null); // { areaFt, perimeterFt, midScreen }
  // Endpoint-snap highlight target (for continuous drawing)
  const [endpointSnap, setEndpointSnap] = useState(null);
  // Box-select state
  const boxSelectStart = useRef(null);
  const [boxSelectDraft, setBoxSelectDraft] = useState(null);
  // Pinch-to-zoom state (mobile) — tracks initial finger distance + zoom
  const pinchRef = useRef(null);
  // Double-tap detection (mobile) — finishes line-tool drawing like desktop double-click
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });
  const justFinishedRef = useRef(false);
  const isTouchRef = useRef(false);
  // 1 world unit = 1 foot (DIMENSIONS.ACRE.width = 220ft, etc.)
  const FT_PER_UNIT = 1;

  // Last point of the active draft — used as the ortho anchor + angle origin
  const getDraftAnchor = () => {
    if (activeTool === "canal") return canalDraft?.[canalDraft.length - 1];
    if (activeTool === "khal") return khalDraft?.[khalDraft.length - 1];
    if (activeTool === "road") return roadDraft?.[roadDraft.length - 1];
    if (activeTool === "bridge") return bridgeDraft?.[bridgeDraft.length - 1];
    if (activeTool === "mouza") return mouzaDraft?.[mouzaDraft.length - 1];
    if (activeTool === "chakbandi") return chakbandiDraft?.[chakbandiDraft.length - 1];
    return null;
  };

  useImperativeHandle(ref, () => ({ getCanvas: () => canvasRef.current }));

  const C = colorSettings || {};

  // Z-Index render order: Layer 1(fills)+2(boundaries) → Layer 3(infra) → Layer 4(markers) → Layer 5(labels embedded in draw fns)
  const DRAW_ORDER = ["mouza", "muraba", "mustateel", "acre", "road", "bridge", "canal", "khal", "chakbandi", "outlet", "damageMarker"];

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = bgColor || "#ffffff";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Layer 0: Grid (editor only)
    drawGrid(ctx, W, H, zoom, pan, gridFlags || {});

    // Frustum-culled sorted object draw
    const sorted = [...objects].sort((a, b) => DRAW_ORDER.indexOf(a.type) - DRAW_ORDER.indexOf(b.type));
    const mouzaObjects = objects.filter(o => o.type === "mouza");
    for (const obj of sorted) {
      if (!isInViewport(obj, pan, zoom, W, H)) continue;
      const layerKey = obj.type === "chakbandi" ? "chakbandi" : obj.type === "damageMarker" ? "outlet" : obj.type;
      const layer = layers[layerKey] || { visible: true };
      if (!layer.visible) continue;
      const isSelected = obj.id === selectedId;

      const kv = killaVisibility || { mustateel: true, muraba: true };
      if (obj.type === "acre") drawAcre(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "mustateel") drawMustateel(ctx, obj, isSelected, zoom, C, obj.excluded || (obj.showKillaNumbers !== false && kv.mustateel !== false), getMustateelMouzaSplit(obj, mouzaObjects), kv.acreUseLabels !== false);
      else if (obj.type === "muraba") drawMuraba(ctx, obj, isSelected, zoom, C, obj.showKillaNumbers !== false && kv.muraba !== false, getMustateelMouzaSplit(obj, mouzaObjects), kv.acreUseLabels !== false);
      else if (obj.type === "canal") drawCanal(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "khal") drawKhal(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "road") drawRoad(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "bridge") drawBridge(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "outlet") drawOutlet(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "chakbandi") drawChakbandi(ctx, obj, isSelected, zoom, C, true);
      else if (obj.type === "mouza") drawMouza(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "damageMarker") drawDamageMarker(ctx, obj, isSelected, zoom);
    }

    // CCA/GCA fraction labels for chakbandis — drawn above all objects in boxes.
    // The live GCA calculation is O(parcels × cells × canals) per chakbandi — far too
    // expensive to run every frame on large merged maps. We skip the live recalculation
    // while panning/dragging and fall back to each chakbandi's stored cca/gca/centerLabel.
    {
      const _parcels = objects.filter(o => ["acre", "mustateel", "muraba"].includes(o.type));
      const _canals = objects.filter(o => o.type === "canal");
      const _chakbandis = objects.filter(o => o.type === "chakbandi");
      const gcaFontWorld = Math.min(DIMENSIONS.MUSTATEEL.width, DIMENSIONS.MUSTATEEL.height) * 0.30;
      const gcaFont = Math.max(12, Math.min(24, gcaFontWorld * zoom)) / zoom;
      const interacting = isPanning.current || isMoving.current || !!vertexDrag.current;
      for (const ch of _chakbandis) {
        if (ch.points?.length >= 3) {
          const gca = interacting ? 0 : calculateChakbandiGCA(ch, _parcels, _canals);
          if (gca > 0 || ch.centerLabel || ch.cca || ch.gca) {
            const lp = getChakbandiLabelPos(ch);
            if (!lp) continue;
            const { cca: _cca, gca: _gca } = getCCAGCAText(ch, gca);
            let cca = _cca, gcaTxt = _gca;
            // centerLabel is stored as "(cca/gca)" — split it into a stacked fraction
            // (CCA over a straight line over GCA), matching the moga number fraction.
            if (ch.centerLabel) {
              const m = String(ch.centerLabel).match(/^\(?([^/)]*)\/([^/)]*)\)?$/);
              if (m) {
                cca = m[1].trim(); gcaTxt = m[2].trim();
                // Upper term (CCA) can never exceed the lower term (GCA) — equal is allowed
                if (cca && gcaTxt && parseFloat(cca) > parseFloat(gcaTxt)) cca = gcaTxt;
              }
            }
            if (cca || gcaTxt) {
              drawCCAGCAFractionBoxOnCanvas(ctx, cca, gcaTxt, lp.x, lp.y, gcaFont, "rgba(255,255,255,0.94)", "#166534");
            }
          }
        }
      }
    }

    // Vertex handles for the selected chakbandi/canal/khal — draggable editing.
    // Canal start & end show square anchor handles (matching shape on both ends);
    // intermediate vertices stay circular. Edit-only — never drawn in print/preview.
    const selObj = objects.find(o => o.id === selectedId);
    if (selObj && ["chakbandi", "canal", "khal", "road", "bridge", "mouza"].includes(selObj.type) && selObj.points) {
      const pts = selObj.points;
      const squareEnds = selObj.type === "canal" || selObj.type === "road" || selObj.type === "bridge";
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        ctx.fillStyle = "#3b82f6";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5 / zoom;
        if (squareEnds && (i === 0 || i === pts.length - 1)) {
          const s = 12 / zoom;
          ctx.beginPath(); ctx.rect(p.x - s / 2, p.y - s / 2, s, s); ctx.fill(); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(p.x, p.y, 6 / zoom, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      }
    }

    // Move handles for the selected outlet/moga — 4 arrows so it's clearly draggable
    if (selObj && selObj.type === "outlet" && selObj.start && selObj.end) {
      const cx = (selObj.start.x + selObj.end.x) / 2;
      const cy = (selObj.start.y + selObj.end.y) / 2;
      const r = 22 / zoom;
      ctx.save();
      ctx.strokeStyle = "#06b6d4";
      ctx.fillStyle = "rgba(6,182,212,0.15)";
      ctx.lineWidth = 2 / zoom;
      // Bounding circle
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // 4 directional arrows
      const arrows = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (const [dx, dy] of arrows) {
        const tipX = cx + dx * r, tipY = cy + dy * r;
        const baseX = cx + dx * r * 0.5, baseY = cy + dy * r * 0.5;
        ctx.fillStyle = "#06b6d4";
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(baseX - dy * r * 0.2, baseY + dx * r * 0.2);
        ctx.lineTo(baseX + dy * r * 0.2, baseY - dx * r * 0.2);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    // Draft previews
    drawCanalDraft(ctx, canalDraft, snapPos, zoom, C);
    drawKhalDraft(ctx, khalDraft, snapPos, zoom, C);
    drawRoadDraft(ctx, roadDraft, snapPos, zoom, C);
    drawBridgeDraft(ctx, bridgeDraft, snapPos, zoom, C);
    drawChakbandiDraft(ctx, chakbandiDraft, snapPos, zoom, C);
    drawMouzaDraft(ctx, mouzaDraft, snapPos, zoom, C);
    drawOutletDraft(ctx, outletDraft, snapPos, zoom);
    // Damage marker line draft
    if (damageDraft && snapPos) {
      ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 4 / zoom;
      ctx.lineCap = "round"; ctx.setLineDash([6/zoom, 3/zoom]);
      ctx.beginPath();
      ctx.moveTo(damageDraft.x, damageDraft.y);
      ctx.lineTo(snapPos.x, snapPos.y);
      ctx.stroke(); ctx.setLineDash([]);
    }

    // Box-select draft rectangle
    if (boxSelectDraft) {
      const minX = Math.min(boxSelectDraft.x1, boxSelectDraft.x2);
      const minY = Math.min(boxSelectDraft.y1, boxSelectDraft.y2);
      const w = Math.abs(boxSelectDraft.x2 - boxSelectDraft.x1);
      const h = Math.abs(boxSelectDraft.y2 - boxSelectDraft.y1);
      ctx.strokeStyle = "#3b82f6";
      ctx.fillStyle = "rgba(59,130,246,0.10)";
      ctx.lineWidth = 1.5 / zoom;
      ctx.setLineDash([8/zoom, 4/zoom]);
      ctx.fillRect(minX, minY, w, h);
      ctx.strokeRect(minX, minY, w, h);
      ctx.setLineDash([]);
    }

    // Polygon measurement draft — multi-point polygon with live preview to cursor
    if (measurePoly && measurePoly.length > 0) {
      const pts = [...measurePoly];
      if (snapPos) pts.push(snapPos);
      ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2 / zoom;
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.setLineDash([8/zoom, 4/zoom]);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      if (pts.length >= 3) ctx.closePath();
      ctx.stroke(); ctx.setLineDash([]);
      // Faint fill for the polygon
      if (pts.length >= 3) {
        ctx.fillStyle = "rgba(168,85,247,0.08)";
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath(); ctx.fill();
      }
      // Vertex dots
      for (const pt of measurePoly) {
        ctx.fillStyle = "#a855f7";
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 5/zoom, 0, Math.PI*2); ctx.fill();
      }
    }

    // Live area display while measuring (before double-click finishes)
    if (measurePoly && measurePoly.length >= 3) {
      const pts = measurePoly;
      let liveArea2 = 0, livePerim = 0;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        liveArea2 += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
        livePerim += Math.hypot(pts[j].x - pts[i].x, pts[j].y - pts[i].y);
      }
      const liveAreaFt = Math.abs(liveArea2) / 2;
      const livePerimFt = livePerim;
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const liveMid = worldToScreen(cx, cy, pan.x, pan.y, zoom);
      // Draw live area text at polygon centroid
      ctx.save();
      ctx.restore();
      // We'll render the bubble as a DOM overlay instead (see below)
      // Store live result for the DOM overlay
      if (!measureResult) {
        // Use a ref-like approach: set state only if different to avoid re-render loop
        // Actually, we can't set state inside render. So we draw it on canvas instead.
        ctx.save();
        const bx = liveMid.x, by = liveMid.y;
        ctx.translate(0, 0);
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const label1 = `${liveAreaFt.toFixed(0)} ft²  •  ${(liveAreaFt / 43560).toFixed(2)} acres`;
        const label2 = `Perimeter: ${livePerimFt.toFixed(1)} ft`;
        const tw = Math.max(ctx.measureText(label1).width, ctx.measureText(label2).width) + 16;
        const th = 36;
        // Background pill
        ctx.fillStyle = "rgba(109,40,217,0.92)";
        ctx.beginPath();
        ctx.roundRect(bx - tw/2, by - th - 8, tw, th, 8);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(label1, bx, by - th/2 - 6);
        ctx.font = "11px sans-serif";
        ctx.fillText(label2, bx, by - th/2 + 10);
        ctx.restore();
      }
    }

    ctx.restore();

    // Ghost preview for mustateel/muraba placement
    if (ghostPos) {
      const gx = ghostPos.x * zoom + pan.x;
      const gy = ghostPos.y * zoom + pan.y;
      const gw = ghostPos.w * zoom;
      const gh = ghostPos.h * zoom;
      ctx.save();
      if (ghostPos.blocked) {
        ctx.fillStyle = "rgba(239,68,68,0.18)";
        ctx.strokeStyle = "rgba(239,68,68,0.75)";
      } else {
        ctx.fillStyle = "rgba(59,130,246,0.12)";
        ctx.strokeStyle = "rgba(59,130,246,0.75)";
      }
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeRect(gx, gy, gw, gh);
      ctx.setLineDash([]);
      // Show blocked label
      if (ghostPos.blocked) {
        ctx.fillStyle = "rgba(239,68,68,0.9)";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("⛔ Overlap", gx + gw / 2, gy + gh / 2);
      }
      ctx.restore();
    }

    // Page border guide — rectangle inset from canvas edges (dashed / solid / dotted)
    if (pageBorderStyle && pageBorderStyle !== "none") {
      const margin = 24;
      ctx.save();
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = pageBorderStyle === "dotted" ? 3 : 2;
      if (pageBorderStyle === "dashed") ctx.setLineDash([10, 5]);
      else if (pageBorderStyle === "dotted") ctx.setLineDash([2, 4]);
      else ctx.setLineDash([]); // solid
      ctx.strokeRect(margin, margin, W - margin * 2, H - margin * 2);
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Snap indicator overlay
    if (snapPos) {
      const sx = snapPos.x * zoom + pan.x;
      const sy = snapPos.y * zoom + pan.y;
      ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx - 10, sy); ctx.lineTo(sx + 10, sy);
      ctx.moveTo(sx, sy - 10); ctx.lineTo(sx, sy + 10);
      ctx.stroke();
    }

    // Endpoint-snap highlight — shows where continuous drawing will connect
    if (endpointSnap) {
      const ex = endpointSnap.point.x * zoom + pan.x;
      const ey = endpointSnap.point.y * zoom + pan.y;
      ctx.fillStyle = "rgba(34,211,238,0.30)";
      ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ex, ey, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // Ortho angle readout + guide line while drawing
    if (orthoMode && isLineTool(activeTool) && snapPos) {
      const anchor = getDraftAnchor();
      if (anchor) {
        const ang = segmentAngleDeg(anchor, snapPos);
        const ax = anchor.x * zoom + pan.x, ay = anchor.y * zoom + pan.y;
        const sx = snapPos.x * zoom + pan.x, sy = snapPos.y * zoom + pan.y;
        ctx.strokeStyle = "rgba(99,102,241,0.55)"; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(sx, sy); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = "rgba(99,102,241,0.92)";
        ctx.fillRect(sx + 12, sy - 24, 58, 18);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(`${ang.toFixed(0)}°`, sx + 18, sy - 15);
      }
    }
  }, [objects, zoom, pan, layers, selectedId, activeTool, canalDraft, chakbandiDraft, outletDraft, khalDraft, roadDraft, mouzaDraft, snapPos, C, bgColor, damageDraft, ghostPos, measurePoly, measureResult, endpointSnap, orthoMode, pageBorderStyle, deleteVertexMode]);

  // Render only when render-relevant state changes (on-demand) — NOT every frame.
  // The previous continuous RAF loop redrew the ENTIRE map 60×/sec even when idle,
  // which made large merged maps (hundreds of objects) unbearably slow and laggy.
  // useLayoutEffect runs before paint so dragging/panning stays responsive.
  useLayoutEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    const ro = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    });
    ro.observe(container);
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    return () => ro.disconnect();
  }, []);

  // Edge auto-pan loop — smoothly pans canvas when cursor is near screen edges during drawing
  useEffect(() => {
    let raf;
    const tick = () => {
      const ep = edgePanRef.current;
      if (ep.active && (ep.dx !== 0 || ep.dy !== 0)) {
        onPanChange({ x: panRef.current.x + ep.dx, y: panRef.current.y + ep.dy });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onPanChange]);

  // Capture original positions of all chakbandis + outlets at the start of a
  // canal drag, so elastic hook joints and stuck mogas move by the exact delta.
  const captureAttachedOriginals = useCallback((objs) => {
    attachedOrigRef.current = {
      chakbandis: objs.filter(o => o.type === "chakbandi" && o.points).map(o => ({
        id: o.id, points: o.points.map(p => ({ x: p.x, y: p.y })),
      })),
      outlets: objs.filter(o => o.type === "outlet" && o.start && o.end).map(o => ({
        id: o.id, start: { x: o.start.x, y: o.start.y }, end: { x: o.end.x, y: o.end.y },
      })),
    };
  }, []);

  const getSnappedWorld = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan.x, pan.y, zoom);
    const snap = snapSettings || { gridSnap: true, spineSnap: true, mogaSnap: true, zoom };
    let result = computeSnapPosition(world.x, world.y, activeTool, objectsRef.current, { ...snap, zoom });
    // CAD Ortho — constrain to H/V relative to the last draft point
    if (orthoMode && isLineTool(activeTool)) {
      const anchor = getDraftAnchor();
      if (anchor) result = applyOrthoConstraint(anchor, result, 90);
    } else if (activeTool === "canal" || activeTool === "khal" || activeTool === "road") {
      // Gentle orthogonal snap assist — if the current segment angle is within 5° of
      // horizontal or vertical, gently snap to exact H/V. Still allows free-angle drawing.
      const anchor = getDraftAnchor();
      if (anchor) {
        const dx = result.x - anchor.x, dy = result.y - anchor.y;
        const ang = Math.atan2(dy, dx);
        const tol = 5 * Math.PI / 180; // 5° tolerance
        const snapToAxis = (axisAng) => {
          const dist = Math.hypot(dx, dy);
          if (axisAng === 0 || axisAng === Math.PI) return { x: anchor.x + (dx >= 0 ? dist : -dist), y: anchor.y };
          return { x: anchor.x, y: anchor.y + (dy >= 0 ? dist : -dist) };
        };
        if (Math.abs(ang) < tol || Math.abs(Math.abs(ang) - Math.PI) < tol) result = snapToAxis(0);
        else if (Math.abs(ang - Math.PI / 2) < tol || Math.abs(ang + Math.PI / 2) < tol) result = snapToAxis(Math.PI / 2);
      }
    }
    // Endpoint-snap highlight for continuous drawing
    setEndpointSnap(findNearbyEndpoint(world.x, world.y, objectsRef.current, 10, zoom));
    return result;
  }, [pan, zoom, activeTool, snapSettings, orthoMode, canalDraft, khalDraft, roadDraft, mouzaDraft, chakbandiDraft]);

  const handleMouseMove = useCallback((e) => {
    // Dragging a single vertex of the selected chakbandi/canal
    if (vertexDrag.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const worldRaw = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan.x, pan.y, zoom);
      const obj = objectsRef.current.find(o => o.id === vertexDrag.current.id);
      if (obj && obj.points) {
        // Vertex follows acre/mustateel/canal boundaries — same snapping the draw tool uses
        const snap = snapSettings || { gridSnap: true, spineSnap: true, mogaSnap: true, zoom };
        const others = objectsRef.current.filter(o => o.id !== obj.id);
        const snapType = obj.type === "canal" ? "canal" : obj.type === "khal" ? "khal" : obj.type === "road" ? "road" : "chakbandi";
        const snapped = computeSnapPosition(worldRaw.x, worldRaw.y, snapType, others, { ...snap, zoom });
        const newPoints = obj.points.map((p, i) => i === vertexDrag.current.index ? { x: snapped.x, y: snapped.y } : p);
        onUpdateObject(obj.id, { points: newPoints });
      }
      return;
    }
    // Ghost preview for mustateel/muraba
    if (activeTool === "mustateel" || activeTool === "muraba") {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan.x, pan.y, zoom);
      const dimW = activeTool === "muraba" ? DIMENSIONS.MURABA.width : DIMENSIONS.MUSTATEEL.width;
      const dimH = activeTool === "muraba" ? DIMENSIONS.MURABA.height : DIMENSIONS.MUSTATEEL.height;
      const snap = snapToNearestBoundary({ x: world.x, y: world.y, w: dimW, h: dimH }, objectsRef.current);
      const wouldOverlap = objectsRef.current
        .filter(o => ["mustateel","muraba","acre"].includes(o.type))
        .some(o => rectsOverlap({ x: snap.x, y: snap.y, w: dimW, h: dimH }, o));
      setGhostPos({ x: snap.x, y: snap.y, w: dimW, h: dimH, blocked: wouldOverlap });
    } else if (ghostPos) {
      setGhostPos(null);
    }
    if (isPanning.current || activeTool === "pan") {
      if (isPanning.current) {
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        onPanChange({ x: pan.x + dx, y: pan.y + dy });
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
      return;
    }
    // Edge auto-pan — smoothly pan canvas when cursor approaches screen edges
    {
      const rect = canvasRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const threshold = 90;
      const maxSpeed = 9; // faster auto-pan so users can draw on large maps without hand tool
      let dx = 0, dy = 0;
      if (px < threshold) dx = maxSpeed * (1 - px / threshold);
      else if (px > rect.width - threshold) dx = -maxSpeed * ((px - (rect.width - threshold)) / threshold);
      if (py < threshold) dy = maxSpeed * (1 - py / threshold);
      else if (py > rect.height - threshold) dy = -maxSpeed * ((py - (rect.height - threshold)) / threshold);
      if (dx !== 0 || dy !== 0) {
        edgePanRef.current.active = true;
        edgePanRef.current.dx = dx;
        edgePanRef.current.dy = dy;
      } else {
        edgePanRef.current.active = false;
        edgePanRef.current.dx = 0;
        edgePanRef.current.dy = 0;
      }
    }
    // Freehand drawing — add points on mouse drag
    if (freehandMode && (activeTool === "chakbandi" || activeTool === "mouza")) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const worldRaw = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan.x, pan.y, zoom);
      if (e.buttons === 1) { // only while mouse button is held
        if (activeTool === "chakbandi") onChakbandiPointAdd(worldRaw);
        else if (activeTool === "mouza") onMouzaPointAdd(worldRaw);
      }
    }
    // Box-select: update draft rectangle while dragging
    if (activeTool === "boxSelect" && boxSelectStart.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const worldRaw = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan.x, pan.y, zoom);
      setBoxSelectDraft({ x1: boxSelectStart.current.x, y1: boxSelectStart.current.y, x2: worldRaw.x, y2: worldRaw.y });
      return;
    }
    if (isMoving.current && movingObjId.current && (activeTool === "canalMove" || activeTool === "move" || activeTool === "select")) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const worldRaw = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan.x, pan.y, zoom);
      // Label box dragging (outlet moga or chakbandi GCA)
      if (movingLabelType.current) {
        const nx = worldRaw.x - moveOffset.current.x;
        const ny = worldRaw.y - moveOffset.current.y;
        onUpdateObject(movingObjId.current, { labelPos: { x: nx, y: ny } });
        return;
      }
      // Whole-moga group drag — move all objects in the group by the same delta
      if (movingGroupRef.current) {
        const dx = worldRaw.x - moveOffset.current.x;
        const dy = worldRaw.y - moveOffset.current.y;
        const updates = movingGroupRef.current.originals.map(orig => {
          const changes = {};
          if (orig.x !== undefined) { changes.x = orig.x + dx; changes.y = orig.y + dy; }
          if (orig.points) changes.points = orig.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
          if (orig.start) { changes.start = { x: orig.start.x + dx, y: orig.start.y + dy }; changes.end = { x: orig.end.x + dx, y: orig.end.y + dy }; }
          return { id: orig.id, changes };
        });
        onBulkUpdate(updates);
        return;
      }
      let newX = worldRaw.x - moveOffset.current.x;
      let newY = worldRaw.y - moveOffset.current.y;
      const movingObj = objectsRef.current.find(o => o.id === movingObjId.current);
      if (movingObj && ["mustateel", "muraba", "acre"].includes(movingObj.type)) {
        const snapped = snapMovePosition({ ...movingObj, x: newX, y: newY }, objectsRef.current);
        newX = snapped.x; newY = snapped.y;
        // Block move if it would overlap another parcel — same rule as drawing
        const overlaps = objectsRef.current
          .filter(o => o.id !== movingObj.id && ["mustateel", "muraba", "acre"].includes(o.type))
          .some(o => rectsOverlap({ x: newX, y: newY, w: movingObj.w, h: movingObj.h }, o));
        if (overlaps) return;
        onUpdateObject(movingObjId.current, { x: newX, y: newY });
      } else if (movingObj && movingObjOrigPoints.current) {
        const dx = worldRaw.x - moveOffset.current.x;
        const dy = worldRaw.y - moveOffset.current.y;
        const newPoints = movingObjOrigPoints.current.map(p => ({ x: p.x + dx, y: p.y + dy }));
        // Elastic hook joints + stuck mogas — when a canal moves:
        //  1. Chakbandi endpoints that were touching the canal stay attached (move
        //     with the canal) while the rest of the chakbandi stays put.
        //  2. Mogas/outlets drawn on this canal (outlet.canalId === canal.id) move
        //     with the canal — they stick to it.
        // Uses original positions captured at drag start (attachedOrigRef) so the
        // delta is applied exactly once — no drift/accumulation across frames.
        if (movingObj.type === "canal") {
          const halfW = (movingObj.width || DIMENSIONS.CANAL_WIDTH) / 2;
          const hookThreshold = halfW + 15;
          const origCanalPts = movingObjOrigPoints.current;
          const attached = attachedOrigRef.current || { chakbandis: [], outlets: [] };
          const updates = [{ id: movingObjId.current, changes: { points: newPoints } }];
          // Chakbandi hook joints — move only endpoints that were on the canal
          for (const orig of attached.chakbandis) {
            if (orig.id === movingObjId.current) continue;
            let anyHooked = false;
            const newChPoints = orig.points.map(p => {
              const near = nearestPointOnPolyline(p.x, p.y, origCanalPts);
              if (near && near.dist <= hookThreshold) {
                anyHooked = true;
                // Snap the moved endpoint to the acre grid so chakbandi lines
                // follow gridlines (up/down/left/right) instead of moving diagonally.
                return snapToAcreGrid(p.x + dx, p.y + dy);
              }
              return p;
            });
            if (anyHooked) updates.push({ id: orig.id, changes: { points: newChPoints } });
          }
          // Mogas/outlets stuck to this canal — move start + end by the same delta
          for (const orig of attached.outlets) {
            if (orig.id === movingObjId.current) continue;
            const outlet = objectsRef.current.find(o => o.id === orig.id);
            if (!outlet || outlet.canalId !== movingObjId.current) continue;
            updates.push({
              id: orig.id,
              changes: {
                start: { x: orig.start.x + dx, y: orig.start.y + dy },
                end: { x: orig.end.x + dx, y: orig.end.y + dy },
              },
            });
          }
          if (updates.length > 1) onBulkUpdate(updates);
          else onUpdateObject(movingObjId.current, { points: newPoints });
        } else {
          onUpdateObject(movingObjId.current, { points: newPoints });
        }
      } else if (movingObj && movingObjOrigStartEnd.current) {
        // Moga/outlet — translate both start and end by the drag delta (drag-and-drop)
        const dx = worldRaw.x - moveOffset.current.x;
        const dy = worldRaw.y - moveOffset.current.y;
        const orig = movingObjOrigStartEnd.current;
        onUpdateObject(movingObjId.current, {
          start: { x: orig.start.x + dx, y: orig.start.y + dy },
          end: { x: orig.end.x + dx, y: orig.end.y + dy },
        });
      }
      return;
    }
    // Snap is only needed for drawing/measurement tools — skip the expensive
    // O(objects) snap + endpoint scan for select/move/pan so hovering stays instant
    // on large merged maps.
    const SNAP_TOOLS = ["canal","khal","road","bridge","mouza","chakbandi","outlet","acre","mustateel","muraba","damageMarker","measure"];
    if (SNAP_TOOLS.includes(activeTool)) {
      onSnapPosChange(getSnappedWorld(e));
    }
  }, [activeTool, pan, zoom, getSnappedWorld, onPanChange, onSnapPosChange, onUpdateObject, onBulkUpdate, ghostPos]);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 1 || activeTool === "pan") {
      isPanning.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const worldRaw = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan.x, pan.y, zoom);
    const snapped = getSnappedWorld(e);

    if (activeTool === "measure") {
      // Click adds a polygon vertex
      setMeasurePoly(prev => prev ? [...prev, { x: snapped.x, y: snapped.y }] : [{ x: snapped.x, y: snapped.y }]);
      setMeasureResult(null);
      return;
    }
    if (activeTool === "move") {
      // Check for outlet moga label box drag first
      for (const o of objects) {
        if (o.type === "outlet" && (o.mogha_number || o.mogha_side)) {
          const lp = getOutletLabelPos(o);
          // Hit test based on 2-acre moga box (440×198)
          const _halfDiag = Math.max(DIMENSIONS.ACRE.width, DIMENSIONS.ACRE.height / 2);
          if (Math.hypot(worldRaw.x - lp.x, worldRaw.y - lp.y) < _halfDiag) {
            isMoving.current = true; movingObjId.current = o.id;
            movingLabelType.current = "outlet";
            moveOffset.current = { x: worldRaw.x - lp.x, y: worldRaw.y - lp.y };
            onSelect(o.id);
            return;
          }
        }
      }
      // Check for chakbandi GCA label box drag
      for (const o of objects) {
        if (o.type === "chakbandi" && o.points?.length >= 3) {
          const lp = getChakbandiLabelPos(o);
          if (!lp) continue;
          const _gf = Math.max(12, Math.min(24, Math.min(DIMENSIONS.MUSTATEEL.width, DIMENSIONS.MUSTATEEL.height) * 0.30 * zoom)) / zoom;
          if (Math.hypot(worldRaw.x - lp.x, worldRaw.y - lp.y) < _gf * 3) {
            isMoving.current = true; movingObjId.current = o.id;
            movingLabelType.current = "chakbandi";
            moveOffset.current = { x: worldRaw.x - lp.x, y: worldRaw.y - lp.y };
            onSelect(o.id);
            return;
          }
        }
      }
      const hit = hitTest(worldRaw.x, worldRaw.y, objects);
      if (hit && hit.mogaGroup) {
        // Whole-moga group move — single objects can't be moved individually
        const groupObjs = objects.filter(o => o.mogaGroup === hit.mogaGroup);
        movingGroupRef.current = {
          groupId: hit.mogaGroup,
          originals: groupObjs.map(o => ({
            id: o.id, x: o.x, y: o.y,
            points: o.points ? o.points.map(p => ({ x: p.x, y: p.y })) : null,
            start: o.start ? { x: o.start.x, y: o.start.y } : null,
            end: o.end ? { x: o.end.x, y: o.end.y } : null,
          })),
        };
        isMoving.current = true; movingObjId.current = hit.id;
        moveOffset.current = { x: worldRaw.x, y: worldRaw.y };
        movingObjOrigPoints.current = null; movingObjOrigStartEnd.current = null;
        onSelect(hit.id);
        return;
      }
      if (hit && ["mustateel", "muraba"].includes(hit.type)) {
        isMoving.current = true; movingObjId.current = hit.id;
        moveOffset.current = { x: worldRaw.x - hit.x, y: worldRaw.y - hit.y };
        movingObjOrigPoints.current = null;
        onSelect(hit.id);
      } else if (hit && ["canal", "khal", "road", "bridge", "mouza"].includes(hit.type) && hit.points) {
        isMoving.current = true; movingObjId.current = hit.id;
        moveOffset.current = { x: worldRaw.x, y: worldRaw.y };
        movingObjOrigPoints.current = hit.points.map(p => ({ ...p }));
        if (hit.type === "canal") captureAttachedOriginals(objects);
        onSelect(hit.id);
      } else if (hit && hit.type === "chakbandi" && hit.points) {
        // Chakbandi: select only — no whole-line move. Drag nodes individually.
        onSelect(hit.id);
      } else if (hit && hit.type === "outlet" && hit.start && hit.end) {
        // Moga / outlet — draggable via start+end translation (drag-and-drop)
        isMoving.current = true; movingObjId.current = hit.id;
        moveOffset.current = { x: worldRaw.x, y: worldRaw.y };
        movingObjOrigPoints.current = null;
        movingObjOrigStartEnd.current = { start: { ...hit.start }, end: { ...hit.end } };
        onSelect(hit.id);
      }
    } else if (activeTool === "canalMove") {
      // Canal Move tool — drag only canals (attached chakbandi endpoints + mogas follow)
      const hit = hitTest(worldRaw.x, worldRaw.y, objects);
      if (hit && hit.type === "canal" && hit.points) {
        isMoving.current = true; movingObjId.current = hit.id;
        moveOffset.current = { x: worldRaw.x, y: worldRaw.y };
        movingObjOrigPoints.current = hit.points.map(p => ({ ...p }));
        captureAttachedOriginals(objects);
        onSelect(hit.id);
      } else {
        onSelect(hit ? hit.id : null);
      }
    } else if (activeTool === "acre") onAddObject("acre", snapped);
    else if (activeTool === "mustateel") onAddObject("mustateel", snapped);
    else if (activeTool === "muraba") onAddObject("muraba", snapped);
    else if (activeTool === "canal") onCanalPointAdd(snapped);
    else if (activeTool === "chakbandi") onChakbandiPointAdd(snapped);
    else if (activeTool === "damageMarker") {
      // First click: set start point
      damageStartRef.current = { x: worldRaw.x, y: worldRaw.y };
      setDamageDraft({ x: worldRaw.x, y: worldRaw.y });
    }
    else if (activeTool === "outlet") {
      if (!outletDraft) {
        const canals = objects.filter(o => o.type === "canal");
        let nearestCanal = null, minDist = 30;
        for (const canal of canals) {
          for (let i = 0; i < canal.points.length - 1; i++) {
            const d = distToLineSegment(worldRaw.x, worldRaw.y, canal.points[i].x, canal.points[i].y, canal.points[i+1].x, canal.points[i+1].y);
            if (d < minDist) { minDist = d; nearestCanal = canal; }
          }
        }
        onOutletStart(worldRaw, nearestCanal?.id || null);
      } else onOutletFinish(worldRaw);
    } else if (activeTool === "khal") onKhalPointAdd(snapped);
    else if (activeTool === "road") onRoadPointAdd(snapped);
    else if (activeTool === "bridge") onBridgePointAdd(snapped);
    else if (activeTool === "mouza") onMouzaPointAdd(snapped);
    else if (activeTool === "boxSelect") {
      boxSelectStart.current = { x: worldRaw.x, y: worldRaw.y };
      setBoxSelectDraft({ x1: worldRaw.x, y1: worldRaw.y, x2: worldRaw.x, y2: worldRaw.y });
    } else if (activeTool === "select") {
      // 0. Chakbandi CCA/GCA label — click to edit inline on the map (highest priority,
      //    runs before vertex/label-drag so clicking the CCA value opens the editor).
      for (const o of objects) {
        if (o.type === "chakbandi" && o.points?.length >= 3) {
          const lp = getChakbandiLabelPos(o);
          if (!lp) continue;
          const _gf = Math.max(12, Math.min(24, Math.min(DIMENSIONS.MUSTATEEL.width, DIMENSIONS.MUSTATEEL.height) * 0.30 * zoom)) / zoom;
          if (Math.hypot(worldRaw.x - lp.x, worldRaw.y - lp.y) < _gf * 3) {
            let initCca = o.cca ?? "";
            let initGca = o.gca ?? "";
            if (o.centerLabel) {
              const m = String(o.centerLabel).match(/^\(?([^/)]*)\/([^/)]*)\)?$/);
              if (m) { initCca = initCca || m[1].trim(); initGca = initGca || m[2].trim(); }
            }
            setEditingLabel({ id: o.id, kind: "cca", value: initCca, value2: initGca });
            onSelect(o.id);
            return;
          }
        }
      }
      // 1. Vertex handle on the selected line object (drag a single anchor point)
      const selectedObj = selectedId ? objects.find(o => o.id === selectedId) : null;
      if (selectedObj && ["chakbandi", "canal", "khal", "road", "bridge", "mouza"].includes(selectedObj.type) && selectedObj.points) {
        // Bigger hit area on touch so chakbandi endpoints/nodes are easy to grab
        // and drag onto a canal (finger targets need more room than a mouse cursor).
        const vThresh = (isTouchRef.current ? 30 : 10) / zoom;
        const vIdx = selectedObj.points.findIndex(p => Math.hypot(p.x - worldRaw.x, p.y - worldRaw.y) < vThresh);
        if (vIdx !== -1) {
          // Delete-vertex mode: clicking a vertex removes it (keep ≥ 2 points)
          if (deleteVertexMode && selectedObj.points.length > 2) {
            const newPoints = selectedObj.points.filter((_, i) => i !== vIdx);
            onUpdateObject(selectedObj.id, { points: newPoints });
            return;
          }
          vertexDrag.current = { id: selectedObj.id, index: vIdx };
          return;
        }
      }
      // Select tool — selection + vertex/node editing + move mustateel/muraba
      // parcels (same as the Move tool). Other objects are selection-only.
      const hit = hitTest(worldRaw.x, worldRaw.y, objects);
      if (hit && hit.mogaGroup) {
        const groupObjs = objects.filter(o => o.mogaGroup === hit.mogaGroup);
        movingGroupRef.current = {
          groupId: hit.mogaGroup,
          originals: groupObjs.map(o => ({
            id: o.id, x: o.x, y: o.y,
            points: o.points ? o.points.map(p => ({ x: p.x, y: p.y })) : null,
            start: o.start ? { x: o.start.x, y: o.start.y } : null,
            end: o.end ? { x: o.end.x, y: o.end.y } : null,
          })),
        };
        isMoving.current = true; movingObjId.current = hit.id;
        moveOffset.current = { x: worldRaw.x, y: worldRaw.y };
        onSelect(hit.id);
        return;
      }
      if (hit && ["mustateel", "muraba"].includes(hit.type)) {
        isMoving.current = true; movingObjId.current = hit.id;
        moveOffset.current = { x: worldRaw.x - hit.x, y: worldRaw.y - hit.y };
        movingObjOrigPoints.current = null;
        onSelect(hit.id);
        return;
      }
      if (hit?.type === "damageMarker" && onDamageMarkerClick) {
        onDamageMarkerClick(hit);
        onSelect(hit.id);
        return;
      }
      onSelect(hit ? hit.id : null);
    } else if (activeTool === "eraser") {
      const hit = hitTest(worldRaw.x, worldRaw.y, objects, true); // true = eraser mode (boundary-aware)
      if (hit) onAddObject("__delete__", { id: hit.id });
    }
  }, [activeTool, pan, zoom, objects, selectedId, getSnappedWorld, onAddObject, onCanalPointAdd, onChakbandiPointAdd, onOutletStart, onOutletFinish, onSelect, outletDraft, onKhalPointAdd, onRoadPointAdd, onBridgePointAdd, onMouzaPointAdd, onDamageMarkerClick, deleteVertexMode, captureAttachedOriginals]);

  const handleMouseUp = useCallback((e) => {
    // Finish box-select
    if (activeTool === "boxSelect" && boxSelectStart.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const worldRaw = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan.x, pan.y, zoom);
      const box = { x1: boxSelectStart.current.x, y1: boxSelectStart.current.y, x2: worldRaw.x, y2: worldRaw.y };
      const selected = getObjectsInBox(objects, box);
      if (onBoxSelect) onBoxSelect(selected);
      boxSelectStart.current = null;
      setBoxSelectDraft(null);
    }
    vertexDrag.current = null;
    isPanning.current = false; isMoving.current = false; movingObjId.current = null;
    movingLabelType.current = null;
    movingGroupRef.current = null;
    movingObjOrigPoints.current = null; movingObjOrigStartEnd.current = null;
    attachedOrigRef.current = null;
    edgePanRef.current.active = false; edgePanRef.current.dx = 0; edgePanRef.current.dy = 0;
    // Finish damage marker line on mouse up
    if (activeTool === "damageMarker" && damageStartRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const worldRaw = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan.x, pan.y, zoom);
      const dist = Math.hypot(worldRaw.x - damageStartRef.current.x, worldRaw.y - damageStartRef.current.y);
      if (dist > 3 / zoom) {
        onAddObject("damageMarkerLine", { start: damageStartRef.current, end: worldRaw });
      }
      damageStartRef.current = null;
      setDamageDraft(null);
    }
  }, [activeTool, pan, zoom, onAddObject, onBoxSelect, objects]);

  const handleDblClick = useCallback((e) => {
    if (justFinishedRef.current) { justFinishedRef.current = false; return; }
    if (activeTool === "measure" && measurePoly && measurePoly.length >= 3) {
      // Calculate area (shoelace) + perimeter
      let area2 = 0, perim = 0;
      const pts = measurePoly;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        area2 += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
        perim += Math.hypot(pts[j].x - pts[i].x, pts[j].y - pts[i].y);
      }
      const areaFt = Math.abs(area2) / 2;
      const perimFt = perim;
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const midScreen = worldToScreen(cx, cy, pan.x, pan.y, zoom);
      setMeasureResult({ areaFt, perimFt, midScreen });
      setMeasurePoly(null);
      return;
    }
    if (activeTool === "canal") onCanalFinish();
    if (activeTool === "chakbandi") onChakbandiFinish();
    if (activeTool === "khal") onKhalFinish();
    if (activeTool === "road") onRoadFinish();
    if (activeTool === "bridge") onBridgeFinish();
    if (activeTool === "mouza") onMouzaFinish();
    if (activeTool === "select") {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const worldRaw = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan.x, pan.y, zoom);
      // Double-click on a line of the selected chakbandi/canal (not on an existing vertex)
      // auto-inserts a new draggable anchor point right there — no need to redraw.
      const selectedObj = selectedId ? objectsRef.current.find(o => o.id === selectedId) : null;
      if (selectedObj && ["chakbandi", "canal", "khal", "road", "bridge", "mouza"].includes(selectedObj.type) && selectedObj.points) {
        const vThresh = 10 / zoom;
        const vIdx = selectedObj.points.findIndex(p => Math.hypot(p.x - worldRaw.x, p.y - worldRaw.y) < vThresh);
        if (vIdx !== -1) {
          // Double-click on an existing anchor point → delete it (remove extra points).
          // Keep at least 2 points so the line stays valid.
          if (selectedObj.points.length > 2) {
            const newPoints = selectedObj.points.filter((_, i) => i !== vIdx);
            onUpdateObject(selectedObj.id, { points: newPoints });
          }
          return;
        }
        // Not on a vertex → insert a new anchor point on the nearest line segment
        const near = nearestPointOnPolyline(worldRaw.x, worldRaw.y, selectedObj.points);
        if (near && near.dist < 15 / zoom) {
          const newPoints = [...selectedObj.points];
          newPoints.splice(near.segIdx + 1, 0, { x: near.x, y: near.y });
          onUpdateObject(selectedObj.id, { points: newPoints });
          return;
        }
      }
      const hit = hitTest(worldRaw.x, worldRaw.y, objectsRef.current);
      if (hit?.type === "damageMarker" && onDamageMarkerClick) {
        onDamageMarkerClick(hit);
      } else if (hit && ["canal", "khal", "chakbandi", "road", "bridge"].includes(hit.type)) {
        // Select the line object so the next double-click can add anchor points
        onSelect(hit.id);
      } else if (hit && ["mustateel", "muraba", "acre"].includes(hit.type)) {
        onSelect(hit.id);
        setEditingLabel({ id: hit.id, value: hit.label || "" });
      } else if (hit && hit.type === "outlet") {
        // Double-click moga → edit mogha number + side inline on the map
        onSelect(hit.id);
        setEditingLabel({ id: hit.id, kind: "moga", value: hit.mogha_number || "", value2: hit.mogha_side || "" });
      }
    }
  }, [activeTool, pan, zoom, selectedId, onSelect, onUpdateObject, onCanalFinish, onChakbandiFinish, onKhalFinish, onRoadFinish, onBridgeFinish, onMouzaFinish, onDamageMarkerClick]);

  const commitLabelEdit = useCallback(() => {
    if (!editingLabel) return;
    if (editingLabel.kind === "cca") {
      let cca = String(editingLabel.value || "").trim();
      let gca = String(editingLabel.value2 || "").trim();
      // Upper term (CCA) can never exceed the lower term (GCA) — equal is allowed
      if (cca && gca && parseFloat(cca) > parseFloat(gca)) cca = gca;
      onUpdateObject(editingLabel.id, { cca, gca, centerLabel: (cca || gca) ? `(${cca}/${gca})` : "" });
    } else if (editingLabel.kind === "moga") {
      onUpdateObject(editingLabel.id, { mogha_number: String(editingLabel.value || ""), mogha_side: String(editingLabel.value2 || "") });
    } else {
      onUpdateObject(editingLabel.id, { label: editingLabel.value });
    }
    setEditingLabel(null);
  }, [editingLabel, onUpdateObject]);

  // ---- Touch support (mobile) — tap to draw/select, long-press + drag to move a parcel ----
  const getTouchPoint = (e) => {
    const t = e.touches?.[0] || e.changedTouches?.[0];
    return t ? { clientX: t.clientX, clientY: t.clientY, button: 0 } : null;
  };

  const clearLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const handleTouchStart = useCallback((e) => {
    isTouchRef.current = true;
    // Pinch-to-zoom: two fingers → start pinch
    if (e.touches.length === 2) {
      clearLongPress();
      isPanning.current = false;
      isMoving.current = false;
      const [t1, t2] = e.touches;
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const cx = (t1.clientX + t2.clientX) / 2 - rect.left;
      const cy = (t1.clientY + t2.clientY) / 2 - rect.top;
      pinchRef.current = { initialDist: dist, initialZoom: zoom, centerSX: cx, centerSY: cy, initialPan: { ...pan } };
      return;
    }
    const touch = getTouchPoint(e);
    if (!touch) return;
    // Double-tap → finish line drawing (canal/khal/road/mouza/chakbandi) — mobile parity with desktop double-click
    const now = Date.now();
    const last = lastTapRef.current;
    if ((now - last.time < 350) && Math.hypot(touch.clientX - last.x, touch.clientY - last.y) < 30 && ["canal","khal","road","mouza","chakbandi"].includes(activeTool)) {
      clearLongPress();
      justFinishedRef.current = true;
      if (activeTool === "canal") onCanalFinish();
      else if (activeTool === "khal") onKhalFinish();
      else if (activeTool === "road") onRoadFinish();
      else if (activeTool === "mouza") onMouzaFinish();
      else if (activeTool === "chakbandi") onChakbandiFinish();
      lastTapRef.current = { time: 0, x: 0, y: 0 };
      return;
    }
    lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };
    touchMoved.current = false;
    if (activeTool === "move") {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const worldRaw = screenToWorld(touch.clientX - rect.left, touch.clientY - rect.top, pan.x, pan.y, zoom);
      const hit = hitTest(worldRaw.x, worldRaw.y, objectsRef.current);
      if (hit && ["mustateel", "muraba"].includes(hit.type)) {
        clearLongPress();
        longPressTimer.current = setTimeout(() => {
          if (touchMoved.current) return;
          if (hit.mogaGroup) {
            const groupObjs = objectsRef.current.filter(o => o.mogaGroup === hit.mogaGroup);
            movingGroupRef.current = {
              groupId: hit.mogaGroup,
              originals: groupObjs.map(o => ({
                id: o.id, x: o.x, y: o.y,
                points: o.points ? o.points.map(p => ({ x: p.x, y: p.y })) : null,
                start: o.start ? { x: o.start.x, y: o.start.y } : null,
                end: o.end ? { x: o.end.x, y: o.end.y } : null,
              })),
            };
            isMoving.current = true; movingObjId.current = hit.id;
            moveOffset.current = { x: worldRaw.x, y: worldRaw.y };
            onSelect(hit.id);
            if (navigator.vibrate) navigator.vibrate(30);
            return;
          }
          isMoving.current = true;
          movingObjId.current = hit.id;
          moveOffset.current = { x: worldRaw.x - hit.x, y: worldRaw.y - hit.y };
          onSelect(hit.id);
          if (navigator.vibrate) navigator.vibrate(30);
        }, 450);
      }
    }
    handleMouseDown(touch);
  }, [activeTool, pan, zoom, handleMouseDown, onSelect, onCanalFinish, onKhalFinish, onRoadFinish, onMouzaFinish, onChakbandiFinish]);

  const handleTouchMove = useCallback((e) => {
    // Pinch-to-zoom: two fingers → zoom toward pinch center
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const [t1, t2] = e.touches;
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const { initialDist, initialZoom, centerSX, centerSY, initialPan } = pinchRef.current;
      if (initialDist < 5) return;
      const factor = dist / initialDist;
      const newZoom = Math.max(0.05, Math.min(20, initialZoom * factor));
      const newPanX = centerSX - (centerSX - initialPan.x) * (newZoom / initialZoom);
      const newPanY = centerSY - (centerSY - initialPan.y) * (newZoom / initialZoom);
      onZoomChange(newZoom, { x: newPanX, y: newPanY });
      return;
    }
    e.preventDefault();
    const touch = getTouchPoint(e);
    if (!touch) return;
    touchMoved.current = true;
    if (!isMoving.current) clearLongPress();
    lastMouse.current = { x: touch.clientX, y: touch.clientY };
    handleMouseMove(touch);
  }, [handleMouseMove, onZoomChange]);

  const handleTouchEnd = useCallback((e) => {
    // Still pinching or a finger remains → just reset pinch, don't end interaction
    if (e.touches.length >= 1) {
      pinchRef.current = null;
      return;
    }
    isTouchRef.current = false;
    pinchRef.current = null;
    clearLongPress();
    const touch = getTouchPoint(e) || lastMouse.current;
    handleMouseUp(touch);
  }, [handleMouseUp]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.05, Math.min(20, zoom * factor));
    const newPanX = mx - (mx - pan.x) * (newZoom / zoom);
    const newPanY = my - (my - pan.y) * (newZoom / zoom);
    onZoomChange(newZoom, { x: newPanX, y: newPanY });
  }, [zoom, pan, onZoomChange]);

  // Reset measure state when tool changes away
  const prevToolRef = useRef(activeTool);
  if (prevToolRef.current !== activeTool) {
    prevToolRef.current = activeTool;
  }
  useEffect(() => {
    if (activeTool !== "measure") {
      setMeasurePoly(null);
      setMeasureResult(null);
    }
    edgePanRef.current.active = false; edgePanRef.current.dx = 0; edgePanRef.current.dy = 0;
    // Clear stale snap indicator for tools that don't use snapping
    const SNAP_TOOLS = ["canal","khal","road","bridge","mouza","chakbandi","outlet","acre","mustateel","muraba","damageMarker","measure"];
    if (!SNAP_TOOLS.includes(activeTool)) onSnapPosChange(null);
  }, [activeTool, onSnapPosChange]);

  const cursorClass = {
    select: "cursor-default", pan: "cursor-grab", eraser: "cursor-cell",
    canal: "cursor-crosshair", chakbandi: "cursor-crosshair", outlet: "cursor-crosshair",
    khal: "cursor-crosshair", road: "cursor-crosshair", mouza: "cursor-crosshair",
    acre: "cursor-crosshair", mustateel: "cursor-crosshair", muraba: "cursor-crosshair",
    move: "cursor-move", canalMove: "cursor-move", damageMarker: "cursor-crosshair", measure: "cursor-crosshair",
    boxSelect: "cursor-crosshair",
  }[activeTool] || "cursor-crosshair";

  const editingObj = editingLabel ? objects.find(o => o.id === editingLabel.id) : null;
  let labelPos = null;
  if (editingObj) {
    if (editingLabel.kind === "cca") {
      const lp = getChakbandiLabelPos(editingObj);
      if (lp) labelPos = worldToScreen(lp.x, lp.y, pan.x, pan.y, zoom);
    } else if (editingLabel.kind === "moga") {
      const lp = getOutletLabelPos(editingObj);
      labelPos = worldToScreen(lp.x, lp.y, pan.x, pan.y, zoom);
    } else {
      labelPos = worldToScreen(editingObj.x, editingObj.y, pan.x, pan.y, zoom);
    }
  }

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${cursorClass}`}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDblClick}
        onWheel={handleWheel}
        onMouseLeave={() => { edgePanRef.current.active = false; edgePanRef.current.dx = 0; edgePanRef.current.dy = 0; }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ display: "block", touchAction: "none" }}
      />
      {/* Measurement result bubble — polygon area + perimeter */}
      {measureResult && (
        <div
          className="absolute z-50 pointer-events-none select-none"
          style={{ left: measureResult.midScreen.x, top: measureResult.midScreen.y, transform: "translate(-50%, -120%)" }}
        >
          <div className="bg-purple-700 text-white rounded-xl shadow-2xl px-3 py-2 text-center border border-purple-400">
            <div className="text-xs font-bold font-mono">{measureResult.areaFt.toFixed(0)} ft²</div>
            <div className="text-[10px] font-mono opacity-80">Perimeter: {measureResult.perimFt.toFixed(1)} ft</div>
            <div className="text-[9px] opacity-60 mt-0.5">{(measureResult.areaFt / 43560).toFixed(2)} acres</div>
          </div>
          <div className="w-0 h-0 mx-auto border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-purple-700" />
        </div>
      )}
      {/* Measure hints */}
      {activeTool === "measure" && !measurePoly && !measureResult && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="bg-purple-800/90 text-white text-xs rounded-lg px-3 py-1.5 shadow border border-purple-500">
            Click to add polygon vertices — double-click to finish
          </div>
        </div>
      )}
      {activeTool === "measure" && measurePoly && !measureResult && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="bg-purple-800/90 text-white text-xs rounded-lg px-3 py-1.5 shadow border border-purple-500">
            {measurePoly.length < 3 ? `${measurePoly.length} pts — need ≥3` : `${measurePoly.length} pts — double-click to finish`}
          </div>
        </div>
      )}
      {editingLabel && labelPos && editingLabel.kind !== "cca" && editingLabel.kind !== "moga" && (
        <input
          autoFocus
          value={editingLabel.value}
          onChange={e => setEditingLabel(prev => ({ ...prev, value: e.target.value }))}
          onBlur={commitLabelEdit}
          onKeyDown={e => { if (e.key === "Enter") commitLabelEdit(); if (e.key === "Escape") setEditingLabel(null); }}
          className="absolute z-50 px-2 py-1 text-xs font-bold font-heading text-center bg-white border-2 border-blue-500 rounded shadow-lg outline-none focus:ring-2 focus:ring-blue-300"
          style={{
            left: labelPos.x, top: labelPos.y, transform: "translate(0, -100%)", minWidth: 80, marginTop: -4,
            color: editingObj?.type === "mustateel" ? "#ef4444" : editingObj?.type === "muraba" ? "#dc2626" : "#b45309",
          }}
          placeholder="Label"
        />
      )}
      {editingLabel && labelPos && editingLabel.kind === "cca" && (
        <div
          tabIndex={-1}
          className="absolute z-50 flex flex-col items-center gap-0.5 bg-white border-2 border-green-500 rounded-lg shadow-xl p-1.5"
          style={{ left: labelPos.x, top: labelPos.y, transform: "translate(-50%, 12px)" }}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) commitLabelEdit(); }}
        >
          <input
            autoFocus type="number" value={editingLabel.value}
            onChange={e => setEditingLabel(p => ({ ...p, value: e.target.value }))}
            onKeyDown={e => { if (e.key === "Enter") commitLabelEdit(); if (e.key === "Escape") setEditingLabel(null); }}
            placeholder="CCA" className="w-20 px-1.5 py-0.5 text-xs font-mono text-center text-green-800 border border-green-300 rounded outline-none focus:border-green-500" />
          <div className="w-full h-px bg-green-600" />
          <input
            type="number" value={editingLabel.value2}
            onChange={e => setEditingLabel(p => ({ ...p, value2: e.target.value }))}
            onKeyDown={e => { if (e.key === "Enter") commitLabelEdit(); if (e.key === "Escape") setEditingLabel(null); }}
            placeholder="GCA" className="w-20 px-1.5 py-0.5 text-xs font-mono text-center text-green-800 border border-green-300 rounded outline-none focus:border-green-500" />
        </div>
      )}
      {editingLabel && labelPos && editingLabel.kind === "moga" && (
        <div
          tabIndex={-1}
          className="absolute z-50 flex items-center gap-1 bg-white border-2 border-cyan-500 rounded-lg shadow-xl p-1.5"
          style={{ left: labelPos.x, top: labelPos.y, transform: "translate(-50%, 12px)" }}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) commitLabelEdit(); }}
        >
          <input
            autoFocus type="number" value={editingLabel.value}
            onChange={e => setEditingLabel(p => ({ ...p, value: e.target.value }))}
            onKeyDown={e => { if (e.key === "Enter") commitLabelEdit(); if (e.key === "Escape") setEditingLabel(null); }}
            placeholder="موگہ نمبری" className="w-20 px-1.5 py-0.5 text-xs font-mono text-center text-cyan-800 border border-cyan-300 rounded outline-none focus:border-cyan-500" />
          <select
            value={editingLabel.value2}
            onChange={e => setEditingLabel(p => ({ ...p, value2: e.target.value }))}
            className="px-1 py-0.5 text-xs border border-cyan-300 rounded outline-none bg-white text-cyan-800">
            <option value="">-</option>
            <option value="L">L</option>
            <option value="R">R</option>
          </select>
        </div>
      )}
    </div>
  );
});

export default GISCanvas;