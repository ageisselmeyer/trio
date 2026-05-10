const MIN_GRID_SIDE = 3;
const MAX_GRID_SIDE = 20;
/** Fixed tile and gap (px) so layout does not feed back through changing measurements. */
const TILE_SIZE_PX = 60;
const GRID_GAP_PX = 10;

let gridCols = 5;
let gridRows = 7;

let gridData = [],
  triplets = [],
  tripletStatus = [],
  selectedCells = [],
  isAnimating = false,
  timerSeconds = 0,
  timerInterval = null,
  timerStarted = false,
  gameOverShown = false;

function maxUnitsAlong(edgePx) {
  return Math.floor((edgePx + GRID_GAP_PX) / (TILE_SIZE_PX + GRID_GAP_PX));
}

/** How many tiles fit along one edge, clamped to [MIN, MAX] (overflow uses MIN if cap is too small). */
function fitUnitsAlong(edgePx) {
  const cap = maxUnitsAlong(edgePx);
  if (cap >= MIN_GRID_SIDE) return Math.min(MAX_GRID_SIDE, cap);
  return MIN_GRID_SIDE;
}

/**
 * Columns depend only on available width; rows only on height. Resizing one axis no longer
 * jumps between distant aspect-matched pairs (e.g. 12×20 ↔ 10×17).
 */
function computeGridDimensions(availW, availH) {
  return {
    cols: fitUnitsAlong(availW),
    rows: fitUnitsAlong(availH)
  };
}

function updateGridSizeLabel() {
  const el = document.getElementById("gridSizeValue");
  if (el) el.textContent = `${gridRows}×${gridCols}`;
}

function applyBoardLayout() {
  const app = document.querySelector(".app");
  const area = document.querySelector(".board-area");
  if (!app || !area) return;

  const pad = 8;
  const W = Math.max(80, area.clientWidth - pad);
  const H = Math.max(80, area.clientHeight - pad);

  const { cols, rows } = computeGridDimensions(W, H);
  const g = GRID_GAP_PX;
  const boardW = cols * TILE_SIZE_PX + (cols - 1) * g;
  const boardH = rows * TILE_SIZE_PX + (rows - 1) * g;

  const prevCols = gridCols;
  const prevRows = gridRows;
  gridCols = cols;
  gridRows = rows;
  updateGridSizeLabel();

  app.style.setProperty("--grid-cols", String(cols));
  app.style.setProperty("--grid-rows", String(rows));
  app.style.setProperty("--board-size", `${boardW}px`);
  app.style.setProperty("--board-height", `${boardH}px`);

  const dimsChanged = cols !== prevCols || rows !== prevRows;
  const gridEl = document.getElementById("grid");
  const needsNewGrid = dimsChanged || !gridEl || gridEl.childElementCount === 0;

  if (needsNewGrid) {
    generateGrid();
  }
}

let layoutDebounce = null;
function scheduleBoardLayout() {
  clearTimeout(layoutDebounce);
  layoutDebounce = setTimeout(() => {
    applyBoardLayout();
    layoutDebounce = null;
  }, 60);
}

function initBoardLayout() {
  const area = document.querySelector(".board-area");
  if (!area) return;

  const ro = new ResizeObserver(() => scheduleBoardLayout());
  ro.observe(area);

  const run = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(applyBoardLayout);
    });
  };
  run();
  window.addEventListener("resize", scheduleBoardLayout);
}

function startTimer() {
  if (timerStarted) return;
  timerStarted = true;
  if (timerInterval) clearInterval(timerInterval);
  timerSeconds = 0;
  const timeEl = document.getElementById("timeValue");
  if (timeEl) timeEl.textContent = "0";
  timerInterval = setInterval(() => {
    timerSeconds++;
    const timeElTick = document.getElementById("timeValue");
    if (timeElTick) timeElTick.textContent = String(timerSeconds);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerStarted = false;
}

function generateGrid() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  gridData = [];
  triplets = [];
  tripletStatus = [];
  selectedCells = [];
  isAnimating = false;
  gameOverShown = false;
  stopTimer();
  timerSeconds = 0;
  const timeEl = document.getElementById("timeValue");
  if (timeEl) timeEl.textContent = "0";
  for (let r = 0; r < gridRows; r++) {
    gridData[r] = [];
    for (let c = 0; c < gridCols; c++) {
      let num = Math.floor(Math.random() * 9) + 1;
      gridData[r][c] = num;
      const cell = document.createElement("div");
      const borderIndex = Math.floor(Math.random() * 9) + 1; //use num for fixed colors
      cell.className = `cell border-${borderIndex}`;
      cell.id = `cell-${r}-${c}`;
      cell.textContent = num;
      cell.onclick = () => selectCell(r, c);
      grid.appendChild(cell);
    }
  }
  findTriplets();
  updateCounter();
}

function isValidTriplet(a, b, c) {
  return (a + b === c) || (a + c === b) || (b + c === a);
}

function findTriplets() {
  triplets = [];
  tripletStatus = [];
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      for (let [dr, dc] of dirs) {
        let r2 = r + dr,
          c2 = c + dc,
          r3 = r + 2 * dr,
          c3 = c + 2 * dc;
        if (r3 >= 0 && r3 < gridRows && c3 >= 0 && c3 < gridCols) {
          let a = gridData[r][c],
            b = gridData[r2][c2],
            cVal = gridData[r3][c3];
          if (a != null && b != null && cVal != null && isValidTriplet(a, b, cVal)) {
            triplets.push([
              [r, c],
              [r2, c2],
              [r3, c3]
            ]);
            tripletStatus.push("hidden");
          }
        }
      }
    }
  }
}

function selectCell(r, c) {
  if (isAnimating || gridData[r][c] == null) return;
  startTimer();
  const cell = document.getElementById(`cell-${r}-${c}`);
  if (!cell || cell.classList.contains("found")) return;
  cell.classList.toggle("selected");
  if (cell.classList.contains("selected")) selectedCells.push([r, c]);
  else selectedCells = selectedCells.filter(x => !(x[0] === r && x[1] === c));
  if (selectedCells.length === 3) checkFoundTriplet();
}

function checkFoundTriplet() {
  const coords = selectedCells.map(x => x.toString()).sort().join("|");
  for (let i = 0; i < triplets.length; i++) {
    const t = triplets[i];
    const tcoords = t.map(x => x.toString()).sort().join("|");
    if (coords === tcoords && tripletStatus[i] === "hidden") {
      removeTriplet(i);
      clearSelection();
      return;
    }
  }
  clearSelection();
}

function removeTriplet(index) {
  if (isAnimating) return;
  isAnimating = true;
  const t = triplets[index],
    app = document.querySelector(".app");
  for (let [r, c] of t) {
    const cell = document.getElementById(`cell-${r}-${c}`);
    cell.classList.remove("selected");
    cell.classList.add("removing", "found");
    for (let i = 0; i < 5; i++) {
      const sparkle = document.createElement("div");
      sparkle.className = "sparkle";
      sparkle.textContent = "✨";
      const rect = cell.getBoundingClientRect(),
        appRect = app.getBoundingClientRect();
      sparkle.style.left = (rect.left - appRect.left + 12) + "px";
      sparkle.style.top = (rect.top - appRect.top + 12) + "px";
      const dx = (Math.random() * 60 - 30) + "px",
        dy = (Math.random() * 60 - 30) + "px";
      sparkle.style.setProperty("--dx", dx);
      sparkle.style.setProperty("--dy", dy);
      app.appendChild(sparkle);
      setTimeout(() => sparkle.remove(), 600);
    }
  }
  setTimeout(() => {
    for (let [r, c] of t) {
      gridData[r][c] = null;
      const cell = document.getElementById(`cell-${r}-${c}`);
      if (!cell) continue;
      cell.textContent = "";
      cell.style.visibility = "hidden";
      cell.style.opacity = "0";
      cell.classList.remove("removing");
    }
    tripletStatus[index] = "found";
    isAnimating = false;
    updateCounter();
  }, 300);
}

function clearSelection() {
  for (let [r, c] of selectedCells) {
    const cell = document.getElementById(`cell-${r}-${c}`);
    if (cell) cell.classList.remove("selected");
  }
  selectedCells = [];
}

function updateCounter() {
  const remaining = tripletStatus.filter((s, i) => s === "hidden" && triplets[i].every(([r, c]) => gridData[r][c] != null));
  const countEl = document.getElementById("countValue");
  if (countEl) countEl.textContent = String(remaining.length);
  if (remaining.length === 0) {
    stopTimer();
    showGameOver();
  }
}

function showGameOver() {
  if (gameOverShown) return;
  gameOverShown = true;
  const app = document.querySelector(".app");
  if (!app) return;
  const overlay = document.createElement("div");
  overlay.className = "game-over-message";
  const label = document.createElement("span");
  label.textContent = "Geschafft! 🎉";
  overlay.appendChild(label);
  app.appendChild(overlay);
  overlay.addEventListener("click", () => {
    overlay.remove();
    generateGrid();
  });
}

function openHelp() {
  const existing = document.getElementById("help-backdrop");
  if (existing) return;
  const backdrop = document.createElement("div");
  backdrop.id = "help-backdrop";
  backdrop.className = "help-modal-backdrop";
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      backdrop.remove();
    }
  });

  const modal = document.createElement("div");
  modal.className = "help-modal";
  modal.innerHTML = `
          <h3>Spielanleitung</h3>
          <p>Finde alle Trios, also Dreiergruppen, bei denen zwei Zahlen zusammen die dritte ergeben.<br>
            <strong>Beispiel:</strong> 374 ist ein Trio, weil 3 + 4 = 7.</p>
          <ul>
            <li>Tippe nacheinander <strong>drei benachbarte Felder</strong> an (horizontal / vertikal / diagonal), um ein Trio auszuwählen.</li>
            <li>Hast du alles richtig gemacht, dann verschwinden die drei Felder.</li>
            <li>Mit <strong>Aufdecken</strong> kannst du dir ein noch verstecktes Trio anzeigen lassen.</li>
          </ul>
          <button class="help-modal-close" onclick="closeHelp()">Verstanden</button>
        `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
}

function closeHelp() {
  const backdrop = document.getElementById("help-backdrop");
  if (backdrop) backdrop.remove();
}

function revealNext() {
  for (let i = 0; i < triplets.length; i++) {
    if (tripletStatus[i] === "hidden" && triplets[i].every(([r, c]) => gridData[r][c] != null)) {
      tripletStatus[i] = "revealed";
      for (let [r, c] of triplets[i]) {
        const cell = document.getElementById(`cell-${r}-${c}`);
        cell.classList.add("revealed", "glow");
        setTimeout(() => cell.classList.remove("glow"), 800);
      }
      updateCounter();
      return;
    }
  }
  alert("Alles aufgedeckt!");
}

initBoardLayout();
