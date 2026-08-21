(() => {
  const COLORS = [
    "#1c1814",
    "#6b6560",
    "#d4452c",
    "#e67a2e",
    "#d6a20b",
    "#2f9e6b",
    "#2b6cdb",
    "#7c5cbf",
    "#ffffff",
    "#f2ece3",
  ];

  const STORAGE_KEY = "whiteboard.v1";
  const MAX_HISTORY = 80;
  const GRID = 48;

  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const textInput = document.getElementById("text-input");
  const laserDot = document.getElementById("laser-dot");
  const fileInput = document.getElementById("file-input");
  const toastEl = document.getElementById("toast");
  const statusEl = document.getElementById("status");
  const pagesEl = document.getElementById("pages");
  const swatchesEl = document.getElementById("swatches");
  const sizeInput = document.getElementById("size");
  const sizeValue = document.getElementById("size-value");
  const nameInput = document.getElementById("board-name");
  const zoomReset = document.getElementById("zoom-reset");
  const saveMenu = document.getElementById("save-menu");
  const help = document.getElementById("help");

  const uid = () => Math.random().toString(36).slice(2, 10);

  const blankPage = (n = 1) => ({
    id: uid(),
    name: `Page ${n}`,
    objects: [],
    past: [],
    future: [],
  });

  const state = {
    name: "Untitled board",
    tool: "pen",
    color: "#1c1814",
    size: 4,
    filled: false,
    grid: true,
    present: false,
    view: { x: 0, y: 0, scale: 1 },
    pages: [blankPage(1)],
    pageIndex: 0,
    drawing: null,
    panning: false,
    panFrom: null,
    space: false,
    pointers: new Map(),
    pinch: null,
    dirty: false,
    selectedId: null,
    hoverId: null,
    dragNode: null,
    linkFrom: null,
  };

  const page = () => state.pages[state.pageIndex];

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => {
      toastEl.hidden = true;
    }, 1600);
  }

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function dpr() {
    return Math.min(window.devicePixelRatio || 1, 2.5);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const r = dpr();
    canvas.width = Math.max(1, Math.floor(rect.width * r));
    canvas.height = Math.max(1, Math.floor(rect.height * r));
    ctx.setTransform(r, 0, 0, r, 0, 0);
    draw();
  }

  function screenToWorld(sx, sy) {
    const { x, y, scale } = state.view;
    return { x: (sx - x) / scale, y: (sy - y) / scale };
  }

  function worldToScreen(wx, wy) {
    const { x, y, scale } = state.view;
    return { x: wx * scale + x, y: wy * scale + y };
  }

  function eventPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
  }

  function snapshot() {
    return JSON.parse(JSON.stringify(page().objects));
  }

  function commit(nextObjects) {
    const p = page();
    p.past.push(p.objects);
    if (p.past.length > MAX_HISTORY) p.past.shift();
    p.future = [];
    p.objects = nextObjects;
    state.dirty = true;
    persistSoon();
    syncUndoButtons();
    draw();
  }

  function undo() {
    const p = page();
    if (!p.past.length) return;
    p.future.push(p.objects);
    p.objects = p.past.pop();
    state.dirty = true;
    persistSoon();
    syncUndoButtons();
    draw();
  }

  function redo() {
    const p = page();
    if (!p.future.length) return;
    p.past.push(p.objects);
    p.objects = p.future.pop();
    state.dirty = true;
    persistSoon();
    syncUndoButtons();
    draw();
  }

  function syncUndoButtons() {
    const p = page();
    document.getElementById("btn-undo").disabled = !p.past.length;
    document.getElementById("btn-redo").disabled = !p.future.length;
  }

  function persistSoon() {
    clearTimeout(persistSoon.t);
    persistSoon.t = setTimeout(persist, 400);
  }

  function persist() {
    const data = {
      version: 1,
      name: state.name,
      pageIndex: state.pageIndex,
      pages: state.pages.map(({ id, name, objects }) => ({ id, name, objects })),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      state.dirty = false;
      setStatus("Saved locally");
    } catch {
      setStatus("Could not autosave (storage full)");
    }
  }

  function restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.pages) || !data.pages.length) return;
      state.name = data.name || "Untitled board";
      state.pages = data.pages.map((p, i) => ({
        id: p.id || uid(),
        name: p.name || `Page ${i + 1}`,
        objects: Array.isArray(p.objects) ? p.objects : [],
        past: [],
        future: [],
      }));
      state.pageIndex = Math.min(data.pageIndex || 0, state.pages.length - 1);
      nameInput.value = state.name;
    } catch {
      /* ignore corrupt save */
    }
  }

  function boardBounds(objects) {
    if (!objects.length) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const grow = (x, y, pad = 0) => {
      minX = Math.min(minX, x - pad);
      minY = Math.min(minY, y - pad);
      maxX = Math.max(maxX, x + pad);
      maxY = Math.max(maxY, y + pad);
    };
    for (const o of objects) {
      if (o.points) {
        for (const pt of o.points) grow(pt.x, pt.y, (o.size || 4) + 8);
      } else if (o.type === "text") {
        grow(o.x, o.y, 8);
        grow(o.x + (o.text || "").length * (o.size || 20) * 0.55, o.y + (o.size || 20) * 1.4);
      } else if (o.type === "note" || o.type === "flow-box" || o.type === "flow-if") {
        grow(o.x, o.y);
        grow(o.x + o.w, o.y + o.h);
      } else {
        grow(o.x1 ?? o.x, o.y1 ?? o.y, o.size || 4);
        grow(o.x2 ?? o.x + (o.w || 0), o.y2 ?? o.y + (o.h || 0), o.size || 4);
      }
    }
    if (!Number.isFinite(minX)) return null;
    return { minX, minY, maxX, maxY };
  }

  function applyView() {
    const rect = canvas.getBoundingClientRect();
    ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
    ctx.translate(state.view.x, state.view.y);
    ctx.scale(state.view.scale, state.view.scale);
    return rect;
  }

  function drawGrid(rect) {
    if (!state.grid) return;
    const { x, y, scale } = state.view;
    const left = -x / scale;
    const top = -y / scale;
    const right = (rect.width - x) / scale;
    const bottom = (rect.height - y) / scale;
    const startX = Math.floor(left / GRID) * GRID;
    const startY = Math.floor(top / GRID) * GRID;
    ctx.strokeStyle = "rgba(28, 24, 20, 0.06)";
    ctx.lineWidth = 1 / scale;
    ctx.beginPath();
    for (let gx = startX; gx <= right; gx += GRID) {
      ctx.moveTo(gx, top);
      ctx.lineTo(gx, bottom);
    }
    for (let gy = startY; gy <= bottom; gy += GRID) {
      ctx.moveTo(left, gy);
      ctx.lineTo(right, gy);
    }
    ctx.stroke();
  }

  function drawStroke(c, points, color, size, alpha) {
    if (!points.length) return;
    c.save();
    c.globalAlpha = alpha;
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = size;
    c.lineCap = "round";
    c.lineJoin = "round";
    if (points.length === 1) {
      c.beginPath();
      c.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
      c.fill();
      c.restore();
      return;
    }
    c.beginPath();
    c.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i].x + points[i + 1].x) / 2;
      const my = (points[i].y + points[i + 1].y) / 2;
      c.quadraticCurveTo(points[i].x, points[i].y, mx, my);
    }
    c.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    c.stroke();
    c.restore();
  }

  function drawArrowhead(c, x1, y1, x2, y2, size, color) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const len = Math.max(12, size * 3.2);
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x2, y2);
    c.lineTo(x2 - len * Math.cos(angle - 0.4), y2 - len * Math.sin(angle - 0.4));
    c.lineTo(x2 - len * Math.cos(angle + 0.4), y2 - len * Math.sin(angle + 0.4));
    c.closePath();
    c.fill();
  }

  function wrapText(c, text, x, y, maxW, lineH) {
    wrapLines(c, text, maxW).forEach((line, i) => c.fillText(line, x, y + i * lineH));
  }

  function wrapLines(c, text, maxW) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (c.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function isFlowNode(o) {
    return o && (o.type === "flow-box" || o.type === "flow-if");
  }

  function flowFill(kind) {
    const c = state.color;
    if (c === "#1c1814" || c === "#ffffff" || c === "#f2ece3" || c === "#6b6560") {
      return kind === "flow-if" ? "#d8d0f0" : "#f3c9a4";
    }
    return c;
  }

  function nodeCenter(o) {
    return { x: o.x + o.w / 2, y: o.y + o.h / 2 };
  }

  function nodePorts(o) {
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    return {
      top: { x: cx, y: o.y, side: "top" },
      right: { x: o.x + o.w, y: cy, side: "right" },
      bottom: { x: cx, y: o.y + o.h, side: "bottom" },
      left: { x: o.x, y: cy, side: "left" },
    };
  }

  function closestPort(o, pt) {
    return Object.values(nodePorts(o)).reduce((best, p) => (dist(p, pt) < dist(best, pt) ? p : best));
  }

  function autoSides(from, to) {
    const a = nodeCenter(from);
    const b = nodeCenter(to);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      return { fromSide: dx > 0 ? "right" : "left", toSide: dx > 0 ? "left" : "right" };
    }
    return { fromSide: dy > 0 ? "bottom" : "top", toSide: dy > 0 ? "top" : "bottom" };
  }

  function elbowPoints(from, to, fromSide, toSide) {
    const a = nodePorts(from)[fromSide] || closestPort(from, nodeCenter(to));
    const b = nodePorts(to)[toSide] || closestPort(to, nodeCenter(from));
    if (fromSide === "bottom" || fromSide === "top") {
      const midY = (a.y + b.y) / 2;
      return [a, { x: a.x, y: midY }, { x: b.x, y: midY }, b];
    }
    const midX = (a.x + b.x) / 2;
    return [a, { x: midX, y: a.y }, { x: midX, y: b.y }, b];
  }

  function objectById(id) {
    return page().objects.find((o) => o.id === id);
  }

  function findFlowNodeAt(pt) {
    const objs = page().objects;
    for (let i = objs.length - 1; i >= 0; i--) {
      if (isFlowNode(objs[i]) && hitsObject(objs[i], pt, 0)) return objs[i];
    }
    return null;
  }

  function findFlowLinkAt(pt) {
    const objs = page().objects;
    for (let i = objs.length - 1; i >= 0; i--) {
      if (objs[i].type === "flow-link" && hitsObject(objs[i], pt, 8)) return objs[i];
    }
    return null;
  }

  function linkPolyline(link) {
    const from = objectById(link.from);
    const to = objectById(link.to);
    if (!from || !to) return [];
    return elbowPoints(from, to, link.fromSide, link.toSide);
  }

  function paintCenteredText(c, text, cx, cy, maxW, color) {
    c.save();
    c.fillStyle = color;
    c.font = "15px Segoe UI, system-ui, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    const lines = wrapLines(c, text, maxW);
    const lineH = 18;
    const startY = cy - ((Math.max(lines.length, 1) - 1) * lineH) / 2;
    (lines.length ? lines : [""]).forEach((line, i) => c.fillText(line, cx, startY + i * lineH));
    c.restore();
  }

  function paintDiamond(c, o) {
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    c.beginPath();
    c.moveTo(cx, o.y);
    c.lineTo(o.x + o.w, cy);
    c.lineTo(cx, o.y + o.h);
    c.lineTo(o.x, cy);
    c.closePath();
  }

  function paintFlowLink(c, o) {
    const pts = o.points || linkPolyline(o);
    if (pts.length < 2) return;
    c.save();
    c.strokeStyle = o.color || "#1c1814";
    c.lineWidth = o.size || 2;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
    c.stroke();
    const a = pts[pts.length - 2];
    const b = pts[pts.length - 1];
    drawArrowhead(c, a.x, a.y, b.x, b.y, o.size || 2, o.color || "#1c1814");
    if (o.label) {
      const mid = pts[Math.floor(pts.length / 2)];
      c.font = "13px Segoe UI, system-ui, sans-serif";
      const w = c.measureText(o.label).width + 10;
      c.fillStyle = "#f2ece3";
      c.fillRect(mid.x - w / 2, mid.y - 10, w, 18);
      c.fillStyle = "#1c1814";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(o.label, mid.x, mid.y);
    }
    c.restore();
  }

  function paintPorts(c, o) {
    c.save();
    c.fillStyle = "#2b6cdb";
    c.strokeStyle = "#ffffff";
    c.lineWidth = 1.5;
    Object.values(nodePorts(o)).forEach((p) => {
      c.beginPath();
      c.arc(p.x, p.y, 5, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    });
    c.restore();
  }

  function paintObject(c, o) {
    if (o.type === "stroke" || o.type === "highlighter") {
      drawStroke(c, o.points, o.color, o.size, o.type === "highlighter" ? 0.38 : 1);
      return;
    }
    if (o.type === "line" || o.type === "arrow") {
      c.save();
      c.strokeStyle = o.color;
      c.lineWidth = o.size;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(o.x1, o.y1);
      c.lineTo(o.x2, o.y2);
      c.stroke();
      if (o.type === "arrow") drawArrowhead(c, o.x1, o.y1, o.x2, o.y2, o.size, o.color);
      c.restore();
      return;
    }
    if (o.type === "rect") {
      c.save();
      c.strokeStyle = o.color;
      c.fillStyle = o.color;
      c.lineWidth = o.size;
      if (o.filled) c.fillRect(o.x, o.y, o.w, o.h);
      else c.strokeRect(o.x, o.y, o.w, o.h);
      c.restore();
      return;
    }
    if (o.type === "ellipse") {
      c.save();
      c.strokeStyle = o.color;
      c.fillStyle = o.color;
      c.lineWidth = o.size;
      c.beginPath();
      c.ellipse(o.x + o.w / 2, o.y + o.h / 2, Math.abs(o.w / 2), Math.abs(o.h / 2), 0, 0, Math.PI * 2);
      if (o.filled) c.fill();
      else c.stroke();
      c.restore();
      return;
    }
    if (o.type === "text") {
      c.save();
      c.fillStyle = o.color;
      c.font = `${o.size}px Segoe UI, system-ui, sans-serif`;
      c.textBaseline = "top";
      const lines = String(o.text || "").split("\n");
      lines.forEach((line, i) => c.fillText(line, o.x, o.y + i * o.size * 1.25));
      c.restore();
      return;
    }
    if (o.type === "note") {
      c.save();
      c.fillStyle = o.fill || "#f5d76e";
      c.strokeStyle = "rgba(28,24,20,0.12)";
      c.lineWidth = 1;
      c.fillRect(o.x, o.y, o.w, o.h);
      c.strokeRect(o.x, o.y, o.w, o.h);
      c.fillStyle = "#1c1814";
      c.font = "16px Segoe UI, system-ui, sans-serif";
      c.textBaseline = "top";
      wrapText(c, o.text, o.x + 10, o.y + 10, o.w - 20, 20);
      c.restore();
      return;
    }
    if (o.type === "flow-box") {
      c.save();
      const r = 8;
      c.beginPath();
      if (c.roundRect) c.roundRect(o.x, o.y, o.w, o.h, r);
      else c.rect(o.x, o.y, o.w, o.h);
      c.fillStyle = o.fill || "#f3c9a4";
      c.strokeStyle = o.color || "#1c1814";
      c.lineWidth = 2;
      c.fill();
      c.stroke();
      c.restore();
      paintCenteredText(c, o.text || "Step", o.x + o.w / 2, o.y + o.h / 2, o.w - 24, "#1c1814");
      return;
    }
    if (o.type === "flow-if") {
      c.save();
      paintDiamond(c, o);
      c.fillStyle = o.fill || "#d8d0f0";
      c.strokeStyle = o.color || "#1c1814";
      c.lineWidth = 2;
      c.fill();
      c.stroke();
      c.restore();
      paintCenteredText(c, o.text || "If?", o.x + o.w / 2, o.y + o.h / 2, o.w * 0.46, "#1c1814");
      return;
    }
    if (o.type === "flow-link" || o.type === "flow-link-preview") {
      paintFlowLink(c, o);
    }
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();
    ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim() || "#f2ece3";
    ctx.fillRect(0, 0, rect.width, rect.height);
    applyView();
    drawGrid(rect);
    const objs = page().objects;
    for (const o of objs) {
      if (o.type === "flow-link") paintObject(ctx, o);
    }
    for (const o of objs) {
      if (o.type !== "flow-link") paintObject(ctx, o);
    }
    if (state.drawing) paintObject(ctx, state.drawing);
    const selected = objectById(state.selectedId);
    if (isFlowNode(selected)) {
      ctx.save();
      ctx.strokeStyle = "#2b6cdb";
      ctx.lineWidth = 1.5 / state.view.scale;
      ctx.setLineDash([5 / state.view.scale, 4 / state.view.scale]);
      ctx.strokeRect(selected.x - 4, selected.y - 4, selected.w + 8, selected.h + 8);
      ctx.restore();
      if (state.tool === "select" || state.tool === "flow-link") paintPorts(ctx, selected);
    }
    const hovered = objectById(state.hoverId);
    if (isFlowNode(hovered) && hovered.id !== state.selectedId && (state.tool === "select" || state.tool === "flow-link")) {
      paintPorts(ctx, hovered);
    }
  }

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function hitsObject(o, pt, radius) {
    if (o.points) {
      return o.points.some((p) => dist(p, pt) <= radius + (o.size || 4) / 2);
    }
    if (o.type === "line" || o.type === "arrow") {
      const len = dist({ x: o.x1, y: o.y1 }, { x: o.x2, y: o.y2 }) || 1;
      const t = Math.max(
        0,
        Math.min(1, ((pt.x - o.x1) * (o.x2 - o.x1) + (pt.y - o.y1) * (o.y2 - o.y1)) / (len * len))
      );
      const proj = { x: o.x1 + t * (o.x2 - o.x1), y: o.y1 + t * (o.y2 - o.y1) };
      return dist(proj, pt) <= radius + (o.size || 4);
    }
    if (o.type === "rect" || o.type === "note") {
      const x = Math.min(o.x, o.x + (o.w || 0));
      const y = Math.min(o.y, o.y + (o.h || 0));
      const w = Math.abs(o.w || 0);
      const h = Math.abs(o.h || 0);
      return pt.x >= x && pt.x <= x + w && pt.y >= y && pt.y <= y + h;
    }
    if (o.type === "ellipse") {
      const rx = Math.abs(o.w / 2) || 1;
      const ry = Math.abs(o.h / 2) || 1;
      const nx = (pt.x - (o.x + o.w / 2)) / rx;
      const ny = (pt.y - (o.y + o.h / 2)) / ry;
      return nx * nx + ny * ny <= 1.15;
    }
    if (o.type === "text") {
      const w = String(o.text || " ").length * o.size * 0.55;
      const h = String(o.text || " ").split("\n").length * o.size * 1.25;
      return pt.x >= o.x && pt.x <= o.x + w && pt.y >= o.y && pt.y <= o.y + h;
    }
    if (o.type === "flow-box") {
      return pt.x >= o.x && pt.x <= o.x + o.w && pt.y >= o.y && pt.y <= o.y + o.h;
    }
    if (o.type === "flow-if") {
      const rx = o.w / 2 || 1;
      const ry = o.h / 2 || 1;
      const nx = (pt.x - (o.x + rx)) / rx;
      const ny = (pt.y - (o.y + ry)) / ry;
      return Math.abs(nx) + Math.abs(ny) <= 1.05;
    }
    if (o.type === "flow-link") {
      const pts = linkPolyline(o);
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const len = dist(a, b) || 1;
        const t = Math.max(0, Math.min(1, ((pt.x - a.x) * (b.x - a.x) + (pt.y - a.y) * (b.y - a.y)) / (len * len)));
        const proj = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
        if (dist(proj, pt) <= radius + 6) return true;
      }
      return false;
    }
    return false;
  }

  function eraseAt(pt) {
    const radius = Math.max(12, state.size * 1.6);
    const hitIds = new Set();
    const next = page().objects.filter((o) => {
      const hit = hitsObject(o, pt, radius);
      if (hit && o.id) hitIds.add(o.id);
      return !hit;
    });
    const cleaned = next.filter((o) => o.type !== "flow-link" || (!hitIds.has(o.from) && !hitIds.has(o.to) && objectByIdFrom(next, o.from) && objectByIdFrom(next, o.to)));
    if (cleaned.length !== page().objects.length) {
      page().objects = cleaned;
      if (hitIds.has(state.selectedId)) state.selectedId = null;
      draw();
    }
  }

  function objectByIdFrom(list, id) {
    return list.find((o) => o.id === id);
  }

  function finishErase() {
    if (!state.eraseStart) return;
    const p = page();
    if (p.objects !== state.eraseStart && p.objects.length !== state.eraseStart.length) {
      p.past.push(state.eraseStart);
      if (p.past.length > MAX_HISTORY) p.past.shift();
      p.future = [];
      state.dirty = true;
      persistSoon();
      syncUndoButtons();
    }
    state.eraseStart = null;
  }

  function setTool(tool) {
    finishText();
    state.tool = tool;
    document.querySelectorAll(".tool").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tool === tool);
    });
    canvas.style.cursor =
      tool === "pan" ? "grab" : tool === "laser" ? "none" : tool === "select" ? "default" : "crosshair";
    if (tool === "highlighter" && state.size < 14) setSize(18);
    if (tool === "pen" && state.size > 12) setSize(4);
    if (tool === "text") setSize(Math.max(state.size, 22));
    if (tool === "flow-box") setStatus("Click to place a process step, then type in the box");
    if (tool === "flow-if") setStatus("Click to place a what-if diamond, then type the condition");
    if (tool === "flow-link") setStatus("Click a shape, then click another to connect them");
    if (tool === "select") setStatus("Drag to move. Double-click to edit text");
    state.linkFrom = null;
    state.drawing = null;
  }

  function setColor(color) {
    state.color = color;
    document.getElementById("color-picker").value = color.length === 7 ? color : "#1c1814";
    [...swatchesEl.children].forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.color === color);
    });
    const selected = objectById(state.selectedId);
    if (state.tool === "select" && isFlowNode(selected)) {
      commit(page().objects.map((o) => (o.id === selected.id ? { ...o, fill: color } : o)));
    }
  }

  function setSize(n) {
    state.size = Math.max(1, Math.min(48, Math.round(n)));
    sizeInput.value = String(state.size);
    sizeValue.textContent = String(state.size);
  }

  function setFill(on) {
    state.filled = on;
    document.getElementById("btn-fill").setAttribute("aria-pressed", String(on));
  }

  function zoomAt(sx, sy, factor) {
    const before = screenToWorld(sx, sy);
    state.view.scale = Math.max(0.25, Math.min(4, state.view.scale * factor));
    const after = worldToScreen(before.x, before.y);
    state.view.x += sx - after.x;
    state.view.y += sy - after.y;
    zoomReset.textContent = `${Math.round(state.view.scale * 100)}%`;
    draw();
  }

  function resetView() {
    state.view = { x: 0, y: 0, scale: 1 };
    zoomReset.textContent = "100%";
    draw();
  }

  function renderPages() {
    pagesEl.innerHTML = "";
    state.pages.forEach((p, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `page-tab${i === state.pageIndex ? " active" : ""}`;
      btn.innerHTML = `${p.name}<span class="x" data-del="${i}">×</span>`;
      btn.addEventListener("click", (e) => {
        if (e.target.dataset.del != null) {
          if (state.pages.length === 1) return;
          state.pages.splice(i, 1);
          state.pageIndex = Math.min(state.pageIndex, state.pages.length - 1);
          state.selectedId = null;
          persistSoon();
          renderPages();
          syncUndoButtons();
          draw();
          return;
        }
        state.pageIndex = i;
        state.selectedId = null;
        renderPages();
        syncUndoButtons();
        draw();
      });
      pagesEl.appendChild(btn);
    });
  }

  function addPage() {
    state.pages.push(blankPage(state.pages.length + 1));
    state.pageIndex = state.pages.length - 1;
    persistSoon();
    renderPages();
    syncUndoButtons();
    draw();
  }

  function startShape(type, pt) {
    if (type === "line" || type === "arrow") {
      return { type, color: state.color, size: state.size, x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y };
    }
    return {
      type,
      color: state.color,
      size: state.size,
      filled: state.filled,
      x: pt.x,
      y: pt.y,
      w: 0,
      h: 0,
    };
  }

  function updateShape(obj, pt, shift) {
    if (obj.type === "line" || obj.type === "arrow") {
      obj.x2 = pt.x;
      obj.y2 = pt.y;
      if (shift) {
        const dx = obj.x2 - obj.x1;
        const dy = obj.y2 - obj.y1;
        if (Math.abs(dx) > Math.abs(dy)) obj.y2 = obj.y1;
        else obj.x2 = obj.x1;
      }
      return;
    }
    obj.w = pt.x - obj.x;
    obj.h = pt.y - obj.y;
    if (shift) {
      const s = Math.max(Math.abs(obj.w), Math.abs(obj.h));
      obj.w = Math.sign(obj.w || 1) * s;
      obj.h = Math.sign(obj.h || 1) * s;
    }
  }

  function snap(n) {
    return state.grid ? Math.round(n / 16) * 16 : n;
  }

  function placeFlowNode(pt, type) {
    finishText();
    const w = type === "flow-if" ? 200 : 176;
    const h = type === "flow-if" ? 112 : 68;
    const node = {
      id: uid(),
      type,
      x: snap(pt.x - w / 2),
      y: snap(pt.y - h / 2),
      w,
      h,
      text: type === "flow-if" ? "If?" : "Step",
      fill: flowFill(type),
      color: "#1c1814",
    };
    commit([...page().objects, node]);
    state.selectedId = node.id;
    editFlowText(node);
  }

  function editFlowText(obj) {
    if (!obj) return;
    state.ignoreTextBlur = false;
    if (!textInput.hidden) finishText();
    const tl = worldToScreen(obj.x + 12, obj.y + obj.h / 2 - 22);
    const rect = canvas.getBoundingClientRect();
    textInput.classList.add("flow-edit");
    textInput.hidden = false;
    textInput.value = obj.text || "";
    textInput.style.left = `${Math.max(8, Math.min(tl.x, rect.width - 160))}px`;
    textInput.style.top = `${Math.max(8, Math.min(tl.y, rect.height - 52))}px`;
    textInput.style.width = `${Math.max(120, obj.w * state.view.scale - 24)}px`;
    textInput.style.fontSize = "15px";
    textInput.style.background = obj.fill || "#f7f1e8";
    textInput.dataset.mode = "flow-node";
    textInput.dataset.id = obj.id;
    textInput.dataset.original = obj.text || "";
    state.ignoreTextBlur = true;
    setStatus("Type the condition or label, then press Enter");
    setTimeout(() => {
      textInput.focus();
      textInput.select();
      setTimeout(() => {
        state.ignoreTextBlur = false;
      }, 80);
    }, 0);
  }

  function editFlowLabel(link) {
    if (!link) return;
    const pts = linkPolyline(link);
    const mid = pts[Math.floor(pts.length / 2)] || { x: 0, y: 0 };
    const screen = worldToScreen(mid.x, mid.y);
    textInput.classList.add("flow-edit");
    textInput.hidden = false;
    textInput.value = link.label || "";
    textInput.style.left = `${screen.x - 40}px`;
    textInput.style.top = `${screen.y - 18}px`;
    textInput.style.width = "90px";
    textInput.style.fontSize = "13px";
    textInput.style.background = "#f7f1e8";
    textInput.dataset.mode = "flow-label";
    textInput.dataset.id = link.id;
    textInput.dataset.original = link.label || "";
    state.ignoreTextBlur = true;
    setStatus("Label this arrow (Yes / No), then press Enter");
    setTimeout(() => {
      textInput.focus();
      textInput.select();
      setTimeout(() => {
        state.ignoreTextBlur = false;
      }, 80);
    }, 0);
  }

  function connectNodes(from, to, fromPt, toPt) {
    if (!from || !to || from.id === to.id) return;
    const fromSide = fromPt ? closestPort(from, fromPt).side : autoSides(from, to).fromSide;
    const toSide = toPt ? closestPort(to, toPt).side : autoSides(from, to).toSide;
    const existingFromDecision = page().objects.filter((o) => o.type === "flow-link" && o.from === from.id);
    let label = "";
    if (from.type === "flow-if") {
      const used = new Set(existingFromDecision.map((o) => (o.label || "").toLowerCase()));
      if (!used.has("yes")) label = "Yes";
      else if (!used.has("no")) label = "No";
    }
    const link = {
      id: uid(),
      type: "flow-link",
      from: from.id,
      to: to.id,
      fromSide,
      toSide,
      label,
      color: "#1c1814",
      size: 2,
    };
    commit([...page().objects, link]);
    state.selectedId = link.id;
    if (from.type === "flow-if") editFlowLabel(link);
    else setStatus("Connected");
  }

  function deleteSelected() {
    if (!state.selectedId) return;
    const id = state.selectedId;
    const next = page().objects.filter((o) => o.id !== id && !(o.type === "flow-link" && (o.from === id || o.to === id)));
    if (next.length !== page().objects.length) {
      state.selectedId = null;
      commit(next);
    }
  }

  function placeText(pt, note) {
    state.ignoreTextBlur = false;
    finishText();
    const screen = worldToScreen(pt.x, pt.y);
    const rect = canvas.getBoundingClientRect();
    const left = Math.max(8, Math.min(screen.x, rect.width - 200));
    const top = Math.max(8, Math.min(screen.y, rect.height - 56));
    textInput.hidden = false;
    textInput.value = "";
    textInput.style.left = `${left}px`;
    textInput.style.top = `${top}px`;
    textInput.style.fontSize = note ? "16px" : `${Math.max(18, state.size)}px`;
    textInput.style.background = note ? "#f5d76e" : "#f7f1e8";
    textInput.classList.remove("flow-edit");
    textInput.dataset.mode = note ? "note" : "text";
    textInput.dataset.x = String(pt.x);
    textInput.dataset.y = String(pt.y);
    state.ignoreTextBlur = true;
    setStatus(note ? "Type a note, then press Enter" : "Type, then press Enter");
    setTimeout(() => {
      textInput.focus();
      setTimeout(() => {
        state.ignoreTextBlur = false;
      }, 80);
    }, 0);
  }

  function finishText() {
    if (state.ignoreTextBlur || textInput.hidden) return;
    const text = textInput.value.trim();
    const mode = textInput.dataset.mode;
    const id = textInput.dataset.id;
    const x = Number(textInput.dataset.x);
    const y = Number(textInput.dataset.y);
    textInput.hidden = true;
    textInput.classList.remove("flow-edit");
    textInput.style.width = "";
    if (mode === "flow-node") {
      commit(page().objects.map((o) => (o.id === id ? { ...o, text } : o)));
      return;
    }
    if (mode === "flow-label") {
      commit(page().objects.map((o) => (o.id === id ? { ...o, label: text } : o)));
      return;
    }
    if (!text) return;
    if (mode === "note") {
      commit([
        ...page().objects,
        { type: "note", x, y, w: 220, h: 140, text, fill: "#f5d76e" },
      ]);
    } else {
      commit([
        ...page().objects,
        { type: "text", x, y, text, color: state.color, size: Math.max(18, state.size) },
      ]);
    }
  }

  function onPointerDown(e) {
    if (e.button === 1 || state.space || state.tool === "pan") {
      state.panning = true;
      state.panFrom = { x: e.clientX, y: e.clientY, vx: state.view.x, vy: state.view.y };
      canvas.style.cursor = "grabbing";
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== 0) return;
    const pt = eventPoint(e);
    if (state.tool === "text" || state.tool === "note") {
      e.preventDefault();
      placeText(pt, state.tool === "note");
      return;
    }
    if (state.tool === "flow-box" || state.tool === "flow-if") {
      e.preventDefault();
      placeFlowNode(pt, state.tool);
      return;
    }
    if (state.tool === "select") {
      const node = findFlowNodeAt(pt);
      const link = node ? null : findFlowLinkAt(pt);
      if (node) {
        state.selectedId = node.id;
        state.dragNode = {
          id: node.id,
          origX: node.x,
          origY: node.y,
          fromPt: { x: pt.x, y: pt.y },
          snapshot: snapshot(),
          moved: false,
        };
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = "grabbing";
        draw();
        return;
      }
      if (link) {
        state.selectedId = link.id;
        state.dragNode = null;
        draw();
        return;
      }
      state.selectedId = null;
      draw();
      return;
    }
    if (state.tool === "flow-link") {
      const node = findFlowNodeAt(pt);
      if (!node) {
        state.linkFrom = null;
        state.drawing = null;
        draw();
        setStatus("Click a shape and drag to another to connect");
        return;
      }
      state.linkFrom = { id: node.id, pt };
      state.selectedId = node.id;
      const start = closestPort(node, pt);
      state.drawing = {
        type: "flow-link-preview",
        points: [start, start],
        color: "#1c1814",
        size: 2,
      };
      canvas.setPointerCapture(e.pointerId);
      draw();
      return;
    }
    canvas.setPointerCapture(e.pointerId);
    state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (state.pointers.size === 2) {
      const pts = [...state.pointers.values()];
      state.pinch = {
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        scale: state.view.scale,
      };
      state.drawing = null;
      return;
    }
    if (state.tool === "laser") return;
    if (state.tool === "eraser") {
      state.eraseStart = page().objects;
      state.drawing = { type: "erase" };
      eraseAt(pt);
      return;
    }
    if (state.tool === "pen" || state.tool === "highlighter") {
      state.drawing = {
        type: state.tool === "highlighter" ? "highlighter" : "stroke",
        color: state.color,
        size: state.size,
        points: [pt],
      };
      return;
    }
    state.drawing = startShape(state.tool, pt);
  }

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    if (state.tool === "laser") {
      laserDot.hidden = false;
      laserDot.style.left = `${sx}px`;
      laserDot.style.top = `${sy}px`;
    } else {
      laserDot.hidden = true;
    }
    if (state.tool === "select" || state.tool === "flow-link" || state.tool === "flow-box" || state.tool === "flow-if") {
      const node = findFlowNodeAt(eventPoint(e));
      state.hoverId = node ? node.id : null;
      if (!state.dragNode && !state.drawing) draw();
    }
    if (state.panning && state.panFrom) {
      state.view.x = state.panFrom.vx + (e.clientX - state.panFrom.x);
      state.view.y = state.panFrom.vy + (e.clientY - state.panFrom.y);
      draw();
      return;
    }
    if (state.pointers.has(e.pointerId)) {
      state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (state.pinch && state.pointers.size === 2) {
      const pts = [...state.pointers.values()];
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2 - rect.left, y: (pts[0].y + pts[1].y) / 2 - rect.top };
      const factor = d / (state.pinch.dist || 1);
      const target = state.pinch.scale * factor;
      zoomAt(mid.x, mid.y, target / state.view.scale);
      return;
    }
    if (!state.drawing && !state.dragNode) return;
    const pt = eventPoint(e);
    if (state.dragNode) {
      const node = objectById(state.dragNode.id);
      if (node) {
        const dx = pt.x - state.dragNode.fromPt.x;
        const dy = pt.y - state.dragNode.fromPt.y;
        if (Math.hypot(dx, dy) > 2) state.dragNode.moved = true;
        node.x = snap(state.dragNode.origX + dx);
        node.y = snap(state.dragNode.origY + dy);
        draw();
      }
      return;
    }
    if (state.drawing?.type === "flow-link-preview") {
      const hover = findFlowNodeAt(pt);
      const start = state.drawing.points[0];
      const end = hover && hover.id !== state.linkFrom?.id ? closestPort(hover, pt) : pt;
      state.drawing.points = [start, { x: start.x, y: (start.y + end.y) / 2 }, { x: end.x, y: (start.y + end.y) / 2 }, end];
      state.hoverId = hover ? hover.id : null;
      draw();
      return;
    }
    if (state.drawing.type === "erase") {
      eraseAt(pt);
      return;
    }
    if (state.drawing.points) {
      const last = state.drawing.points[state.drawing.points.length - 1];
      if (dist(last, pt) >= 1.2 / state.view.scale) state.drawing.points.push(pt);
      draw();
      return;
    }
    updateShape(state.drawing, pt, e.shiftKey);
    draw();
  }

  function onPointerUp(e) {
    state.pointers.delete(e.pointerId);
    if (state.pointers.size < 2) state.pinch = null;
    if (state.panning) {
      state.panning = false;
      canvas.style.cursor = state.tool === "pan" ? "grab" : state.tool === "select" ? "default" : "crosshair";
      return;
    }
    if (state.dragNode) {
      const drag = state.dragNode;
      state.dragNode = null;
      canvas.style.cursor = state.tool === "select" ? "default" : "crosshair";
      if (drag.moved) {
        const p = page();
        p.past.push(drag.snapshot);
        if (p.past.length > MAX_HISTORY) p.past.shift();
        p.future = [];
        state.dirty = true;
        persistSoon();
        syncUndoButtons();
      }
      draw();
      return;
    }
    if (state.drawing?.type === "flow-link-preview") {
      const pt = eventPoint(e);
      const to = findFlowNodeAt(pt);
      const from = state.linkFrom ? objectById(state.linkFrom.id) : null;
      state.drawing = null;
      if (from && to && to.id !== from.id) {
        connectNodes(from, to, state.linkFrom.pt, pt);
      }
      state.linkFrom = null;
      draw();
      return;
    }
    const obj = state.drawing;
    state.drawing = null;
    if (!obj || obj.type === "erase") {
      finishErase();
      draw();
      return;
    }
    if (obj.points && obj.points.length) {
      commit([...page().objects, obj]);
      return;
    }
    const tooSmall =
      (obj.w != null && Math.abs(obj.w) < 2 && Math.abs(obj.h) < 2) ||
      (obj.x2 != null && dist({ x: obj.x1, y: obj.y1 }, { x: obj.x2, y: obj.y2 }) < 2);
    if (tooSmall) {
      draw();
      return;
    }
    if (obj.type === "rect" || obj.type === "ellipse") {
      const x = Math.min(obj.x, obj.x + obj.w);
      const y = Math.min(obj.y, obj.y + obj.h);
      obj.w = Math.abs(obj.w);
      obj.h = Math.abs(obj.h);
      obj.x = x;
      obj.y = y;
    }
    commit([...page().objects, obj]);
  }

  function renderToCanvas(scale = 2) {
    const objects = page().objects;
    const bounds = boardBounds(objects);
    const pad = 48;
    let w;
    let h;
    let ox = 0;
    let oy = 0;
    if (bounds) {
      w = Math.ceil(bounds.maxX - bounds.minX + pad * 2);
      h = Math.ceil(bounds.maxY - bounds.minY + pad * 2);
      ox = -bounds.minX + pad;
      oy = -bounds.minY + pad;
    } else {
      const rect = canvas.getBoundingClientRect();
      w = Math.ceil(rect.width);
      h = Math.ceil(rect.height);
    }
    const out = document.createElement("canvas");
    out.width = Math.max(1, w * scale);
    out.height = Math.max(1, h * scale);
    const c = out.getContext("2d");
    c.scale(scale, scale);
    c.fillStyle = "#f2ece3";
    c.fillRect(0, 0, w, h);
    c.translate(ox, oy);
    for (const o of objects) paintObject(c, o);
    return out;
  }

  function download(filename, url) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }

  function slug() {
    return (state.name || "board").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "board";
  }

  function savePng() {
    const out = renderToCanvas(2);
    out.toBlob((blob) => {
      if (!blob) return;
      download(`${slug()}.png`, URL.createObjectURL(blob));
      toast("PNG downloaded");
    }, "image/png");
  }

  function saveJson() {
    persist();
    const data = {
      version: 1,
      name: state.name,
      pageIndex: state.pageIndex,
      pages: state.pages.map(({ id, name, objects }) => ({ id, name, objects })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    download(`${slug()}.whiteboard.json`, URL.createObjectURL(blob));
    toast("Board file downloaded");
  }

  function loadJsonFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data.pages) throw new Error("bad file");
        state.name = data.name || file.name.replace(/\.whiteboard\.json$|\.json$/i, "");
        state.pages = data.pages.map((p, i) => ({
          id: p.id || uid(),
          name: p.name || `Page ${i + 1}`,
          objects: p.objects || [],
          past: [],
          future: [],
        }));
        state.pageIndex = Math.min(data.pageIndex || 0, state.pages.length - 1);
        nameInput.value = state.name;
        persist();
        renderPages();
        syncUndoButtons();
        draw();
        toast("Board opened");
      } catch {
        toast("Could not open that file");
      }
    };
    reader.readAsText(file);
  }

  async function copyPng() {
    try {
      const out = renderToCanvas(2);
      const blob = await new Promise((resolve) => out.toBlob(resolve, "image/png"));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast("Image copied");
    } catch {
      toast("Copy needs a local server in some browsers");
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  function togglePresent() {
    state.present = !state.present;
    document.body.classList.toggle("present", state.present);
    document.getElementById("btn-present").classList.toggle("solid", state.present);
  }

  function buildSwatches() {
    COLORS.forEach((color) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatch";
      btn.dataset.color = color;
      btn.style.background = color;
      if (color === "#ffffff" || color === "#f2ece3") btn.style.boxShadow = "inset 0 0 0 1px #c9bfb3";
      btn.addEventListener("click", () => setColor(color));
      swatchesEl.appendChild(btn);
    });
    setColor(state.color);
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("dblclick", (e) => {
    const pt = eventPoint(e);
    const node = findFlowNodeAt(pt);
    if (node) {
      e.preventDefault();
      state.selectedId = node.id;
      editFlowText(node);
      return;
    }
    const link = findFlowLinkAt(pt);
    if (link) {
      e.preventDefault();
      state.selectedId = link.id;
      editFlowLabel(link);
    }
  });
  canvas.addEventListener("pointerleave", () => {
    laserDot.hidden = true;
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      if (e.ctrlKey || !e.shiftKey) {
        const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
        zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
      } else {
        state.view.x -= e.deltaX || 0;
        state.view.y -= e.deltaY;
        draw();
      }
    },
    { passive: false }
  );

  document.querySelectorAll(".tool").forEach((btn) => {
    btn.addEventListener("click", () => setTool(btn.dataset.tool));
  });
  sizeInput.addEventListener("input", () => setSize(Number(sizeInput.value)));
  document.getElementById("btn-fill").addEventListener("click", () => setFill(!state.filled));
  document.getElementById("color-picker").addEventListener("input", (e) => setColor(e.target.value));
  document.getElementById("btn-undo").addEventListener("click", undo);
  document.getElementById("btn-redo").addEventListener("click", redo);
  document.getElementById("btn-grid").addEventListener("click", () => {
    state.grid = !state.grid;
    document.getElementById("btn-grid").setAttribute("aria-pressed", String(state.grid));
    draw();
  });
  document.getElementById("btn-present").addEventListener("click", togglePresent);
  document.getElementById("btn-fullscreen").addEventListener("click", toggleFullscreen);
  document.getElementById("btn-add-page").addEventListener("click", addPage);
  document.getElementById("zoom-in").addEventListener("click", () => {
    const rect = canvas.getBoundingClientRect();
    zoomAt(rect.width / 2, rect.height / 2, 1.15);
  });
  document.getElementById("zoom-out").addEventListener("click", () => {
    const rect = canvas.getBoundingClientRect();
    zoomAt(rect.width / 2, rect.height / 2, 1 / 1.15);
  });
  document.getElementById("zoom-reset").addEventListener("click", resetView);

  document.getElementById("btn-save").addEventListener("click", (e) => {
    e.stopPropagation();
    saveMenu.hidden = !saveMenu.hidden;
  });
  document.getElementById("save-png").addEventListener("click", () => {
    saveMenu.hidden = true;
    savePng();
  });
  document.getElementById("save-json").addEventListener("click", () => {
    saveMenu.hidden = true;
    saveJson();
  });
  document.getElementById("load-json").addEventListener("click", () => {
    saveMenu.hidden = true;
    fileInput.click();
  });
  document.getElementById("copy-png").addEventListener("click", () => {
    saveMenu.hidden = true;
    copyPng();
  });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (file) loadJsonFile(file);
    fileInput.value = "";
  });
  function openHelp() {
    help.hidden = false;
  }

  function closeHelp(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    help.hidden = true;
  }

  document.getElementById("btn-help").addEventListener("click", openHelp);
  document.getElementById("help-close").addEventListener("click", closeHelp);
  help.addEventListener("click", (e) => {
    if (e.target === help) closeHelp(e);
  });
  document.addEventListener("click", () => {
    saveMenu.hidden = true;
  });
  saveMenu.addEventListener("click", (e) => e.stopPropagation());

  nameInput.addEventListener("input", () => {
    state.name = nameInput.value || "Untitled board";
    persistSoon();
  });
  textInput.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      finishText();
    }
    if (e.key === "Escape") {
      const mode = textInput.dataset.mode;
      if (mode === "flow-node" || mode === "flow-label") {
        textInput.value = textInput.dataset.original || "";
        textInput.hidden = true;
        textInput.classList.remove("flow-edit");
        return;
      }
      textInput.value = "";
      finishText();
    }
  });
  textInput.addEventListener("pointerdown", (e) => e.stopPropagation());
  textInput.addEventListener("blur", () => {
    setTimeout(() => {
      if (document.activeElement === textInput) return;
      finishText();
    }, 0);
  });

  window.addEventListener("keydown", (e) => {
    if (e.target === nameInput || e.target === textInput) return;
    if (e.code === "Space") {
      state.space = true;
      if (!state.panning) canvas.style.cursor = "grab";
      e.preventDefault();
    }
    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && key === "y") {
      e.preventDefault();
      redo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && key === "s") {
      e.preventDefault();
      savePng();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tools = { 1: "pen", 2: "highlighter", 3: "eraser", 4: "line", 5: "arrow", 6: "rect", 7: "ellipse", 8: "text", 9: "note" };
    if (tools[e.key]) setTool(tools[e.key]);
    if (key === "v") setTool("select");
    if (key === "b") setTool("flow-box");
    if (key === "d") setTool("flow-if");
    if (key === "c") setTool("flow-link");
    if (key === "l") setTool("laser");
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      deleteSelected();
    }
    if (key === "g") {
      state.grid = !state.grid;
      draw();
    }
    if (key === "f") toggleFullscreen();
    if (key === "0") resetView();
    if (e.key === "[") setSize(state.size - 1);
    if (e.key === "]") setSize(state.size + 1);
    if (key === "?" || (e.shiftKey && e.key === "/")) {
      if (help.hidden) openHelp();
      else closeHelp();
    }
    if (e.key === "Escape") {
      closeHelp();
      state.selectedId = null;
      state.linkFrom = null;
      state.drawing = null;
      draw();
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      state.space = false;
      if (!state.panning) canvas.style.cursor = state.tool === "pan" ? "grab" : "crosshair";
    }
  });
  window.addEventListener("resize", resize);
  window.addEventListener("beforeunload", persist);

  restore();
  buildSwatches();
  renderPages();
  syncUndoButtons();
  resize();
  if (!localStorage.getItem(STORAGE_KEY)) help.hidden = false;
})();
