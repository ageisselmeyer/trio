let size = 7,
  gridData = [],
  triplets = [],
  tripletStatus = [],
  selectedCells = [],
  isAnimating = false,
  timerSeconds = 0,
  timerInterval = null,
  timerStarted = false,
  gameOverShown = false;

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
  for (let r = 0; r < size; r++) {
    gridData[r] = [];
    for (let c = 0; c < size; c++) {
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
  updateTileBorderThickness();
}

function updateTileBorderThickness() {
  const app = document.querySelector(".app");
  const grid = document.getElementById("grid");
  if (!app || !grid) return;
  const boardSize = grid.clientWidth;
  const borderPx = Math.max(3, Math.min(8, boardSize * 0.012));
  const tileSize = boardSize / 7;
  const fontPx = Math.max(14, Math.min(32, tileSize * 0.37));
  const titlePx = Math.max(22, Math.min(36, tileSize * 0.60));
  const counterPx = Math.max(12, Math.min(19, tileSize * 0.27));
  const buttonPx = Math.max(12, Math.min(17, tileSize * 0.27));
  app.style.setProperty("--tile-border", `${borderPx}px`);
  app.style.setProperty("--tile-font-size", `${fontPx}px`);
  app.style.setProperty("--title-font-size", `${titlePx}px`);
  app.style.setProperty("--counter-font-size", `${counterPx}px`);
  app.style.setProperty("--button-font-size", `${buttonPx}px`);
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
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      for (let [dr, dc] of dirs) {
        let r2 = r + dr,
          c2 = c + dc,
          r3 = r + 2 * dr,
          c3 = c + 2 * dc;
        if (r3 >= 0 && r3 < size && c3 >= 0 && c3 < size) {
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

window.addEventListener("resize", updateTileBorderThickness);
generateGrid();
