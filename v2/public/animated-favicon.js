/* Animated favicon — miniature of the workshop MTG card.
 *
 * Paints to an offscreen canvas at ~12fps and rewrites <link rel="icon">
 * href to a fresh PNG data URL each frame. Replicates the workshop's
 * full play sequence on a continuous loop:
 *
 *   0.0 – 1.8s   front face visible, foil sheen sweeps BL → TR
 *   1.55 – 2.2s  corner gleam blooms in top-right
 *   2.3 – 3.5s   card rotates front → back (Y-axis flip)
 *   3.5 – 5.4s   HOLD at back; gem double-beat pulses violet
 *   5.4 – 6.3s   card rotates back → front
 *   6.3 – 8.5s   rest before the loop repeats
 *
 * The Y-axis flip is simulated in 2D canvas by scaling X = cos(rotation):
 * positive scaleX shows the front, negative shows the back (mirrored).
 */
(function () {
  if (typeof document === 'undefined' || !document.createElement) return;

  var SIZE = 64;
  var CYCLE_MS = 8500;

  var canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var link = document.querySelector('link[rel~="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }

  // ── card geometry ──────────────────────────────────────────────
  var CW = 40;
  var CH = 56;
  var CX = (SIZE - CW) / 2;
  var CY = (SIZE - CH) / 2;
  var BORDER = 2;

  // ── helpers ────────────────────────────────────────────────────
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function poly(points) {
    ctx.beginPath();
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      if (i === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath();
  }

  // ── outside aura — purple bloom around the whole card ──────────
  function drawAura(alpha) {
    var g = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 6, SIZE / 2, SIZE / 2, 34);
    g.addColorStop(0,    'rgba(160, 100, 255, ' + (alpha * 0.55) + ')');
    g.addColorStop(0.45, 'rgba(120,  70, 230, ' + (alpha * 0.30) + ')');
    g.addColorStop(0.75, 'rgba(80,   40, 180, ' + (alpha * 0.12) + ')');
    g.addColorStop(1,    'rgba(60,   25, 140, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  // ── card front ─────────────────────────────────────────────────
  function drawFront() {
    // Outer black border
    ctx.fillStyle = '#050308';
    roundRect(CX, CY, CW, CH, 4);
    ctx.fill();

    var fx = CX + BORDER;
    var fy = CY + BORDER;
    var fw = CW - 2 * BORDER;
    var fh = CH - 2 * BORDER;

    // Inner Izzet gradient (blue UL → black → red LR)
    var frame = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh);
    frame.addColorStop(0,    '#0c2444');
    frame.addColorStop(0.5,  '#07050d');
    frame.addColorStop(1,    '#5a160a');
    roundRect(fx, fy, fw, fh, 2.5);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = frame;
    ctx.fill();

    // Corner glows: cool UL, warm LR
    var blue = ctx.createRadialGradient(fx, fy, 0, fx, fy, 22);
    blue.addColorStop(0, 'rgba(70, 130, 220, 0.65)');
    blue.addColorStop(1, 'rgba(70, 130, 220, 0)');
    ctx.fillStyle = blue;
    ctx.fillRect(fx, fy, fw, fh);

    var red = ctx.createRadialGradient(fx + fw, fy + fh, 0, fx + fw, fy + fh, 22);
    red.addColorStop(0, 'rgba(220, 80, 50, 0.55)');
    red.addColorStop(1, 'rgba(220, 80, 50, 0)');
    ctx.fillStyle = red;
    ctx.fillRect(fx, fy, fw, fh);

    // Hairline borders around inner panels
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 0.4;

    // Title bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(fx + 1, fy + 1, fw - 2, 5);
    ctx.strokeRect(fx + 1, fy + 1, fw - 2, 5);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(fx + 2, fy + 3.5, (fw - 4) * 0.6, 0.6);

    // Art frame
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(fx + 1, fy + 7, fw - 2, 22);
    ctx.strokeRect(fx + 1, fy + 7, fw - 2, 22);

    // Type line
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(fx + 1, fy + 30, fw - 2, 4);
    ctx.strokeRect(fx + 1, fy + 30, fw - 2, 4);

    // Text box
    ctx.fillStyle = 'rgba(20, 14, 36, 0.55)';
    ctx.fillRect(fx + 1, fy + 35, fw - 2, 14);
    ctx.strokeRect(fx + 1, fy + 35, fw - 2, 14);

    // P/T box (Izzet red)
    ctx.fillStyle = '#b8351f';
    ctx.fillRect(fx + fw - 12, fy + fh - 7, 11, 4);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.strokeRect(fx + fw - 12, fy + fh - 7, 11, 4);

    ctx.restore();

    // Cyan rim glow on outer edge
    ctx.strokeStyle = 'rgba(120, 200, 255, 0.5)';
    ctx.lineWidth = 0.6;
    roundRect(CX, CY, CW, CH, 4);
    ctx.stroke();
  }

  // ── card back ──────────────────────────────────────────────────
  function drawBack(gemScale, gemHaloAlpha) {
    // Outer black
    ctx.fillStyle = '#050308';
    roundRect(CX, CY, CW, CH, 4);
    ctx.fill();

    var fx = CX + BORDER;
    var fy = CY + BORDER;
    var fw = CW - 2 * BORDER;
    var fh = CH - 2 * BORDER;

    // Mirrored Izzet gradient (red UL → black → blue LR)
    var frame = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh);
    frame.addColorStop(0,   '#5a160a');
    frame.addColorStop(0.5, '#07050d');
    frame.addColorStop(1,   '#0c2444');
    roundRect(fx, fy, fw, fh, 2.5);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = frame;
    ctx.fill();

    // Strips above + below center
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(fx + 4, fy + 11, fw - 8, 0.6);
    ctx.fillRect(fx + 4, fy + fh - 12, fw - 8, 0.6);

    // Halo bloom behind gem
    var gemCx = fx + fw / 2;
    var gemCy = fy + fh / 2;
    var halo = ctx.createRadialGradient(gemCx, gemCy, 1, gemCx, gemCy, 18);
    halo.addColorStop(0,    'rgba(180, 130, 255, ' + gemHaloAlpha + ')');
    halo.addColorStop(0.45, 'rgba(120,  70, 230, ' + (gemHaloAlpha * 0.5) + ')');
    halo.addColorStop(1,    'rgba(60,   25, 140, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(fx, fy, fw, fh);

    // Hex gem
    ctx.save();
    ctx.translate(gemCx, gemCy);
    ctx.scale(gemScale, gemScale);

    var R = 8;
    var verts = [
      [0, -R],
      [R * 0.866, -R * 0.5],
      [R * 0.866,  R * 0.5],
      [0,  R],
      [-R * 0.866, R * 0.5],
      [-R * 0.866, -R * 0.5]
    ];
    poly(verts);
    var gemGrad = ctx.createRadialGradient(-2, -3, 0, 0, 0, 11);
    gemGrad.addColorStop(0,    '#e6d4ff');
    gemGrad.addColorStop(0.35, '#a075f0');
    gemGrad.addColorStop(0.7,  '#5a2da8');
    gemGrad.addColorStop(1,    '#1c0e3a');
    ctx.fillStyle = gemGrad;
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#a3d1ff';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Top facet wash
    ctx.beginPath();
    ctx.moveTo(0, -R);
    ctx.lineTo(R * 0.866, -R * 0.5);
    ctx.lineTo(0, 0);
    ctx.lineTo(-R * 0.866, -R * 0.5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fill();

    // Spokes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 0.3;
    for (var i = 0; i < verts.length; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(verts[i][0], verts[i][1]);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();

    // Cyan rim glow
    ctx.strokeStyle = 'rgba(120, 200, 255, 0.5)';
    ctx.lineWidth = 0.6;
    roundRect(CX, CY, CW, CH, 4);
    ctx.stroke();
  }

  // ── foil sheen (overlay during front phase) ────────────────────
  function drawFoilSheen(progress) {
    // progress 0-1: position of the band centre across the card diagonal
    var startTx = -CW * 0.7;
    var startTy = CH * 0.7;
    var endTx = CW * 0.7;
    var endTy = -CH * 0.7;
    var tx = startTx + (endTx - startTx) * progress;
    var ty = startTy + (endTy - startTy) * progress;

    ctx.save();
    roundRect(CX, CY, CW, CH, 4);
    ctx.clip();
    ctx.globalCompositeOperation = 'screen';

    var cx = CX + CW / 2 + tx;
    var cy = CY + CH / 2 + ty;
    // Gradient perpendicular to the sweep vector (45°)
    var g = ctx.createLinearGradient(cx - 22, cy + 22, cx + 22, cy - 22);
    g.addColorStop(0,    'rgba(255, 255, 255, 0)');
    g.addColorStop(0.35, 'rgba(170, 110, 255, 0.30)');
    g.addColorStop(0.46, 'rgba(120, 220, 255, 0.55)');
    g.addColorStop(0.5,  'rgba(255, 240, 200, 0.7)');
    g.addColorStop(0.54, 'rgba(255, 160, 240, 0.55)');
    g.addColorStop(0.65, 'rgba(140, 255, 200, 0.30)');
    g.addColorStop(1,    'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(CX - 16, CY - 16, CW + 32, CH + 32);

    ctx.restore();
  }

  // ── corner gleam (top-right) ───────────────────────────────────
  function drawGleam(scale, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;
    ctx.translate(CX + CW - 2, CY + 2);
    ctx.scale(scale, scale);

    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
    g.addColorStop(0,    'rgba(255, 255, 255, 1)');
    g.addColorStop(0.12, 'rgba(255, 250, 210, 0.9)');
    g.addColorStop(0.35, 'rgba(255, 220, 255, 0.45)');
    g.addColorStop(1,    'rgba(180, 220, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(-16, -16, 32, 32);

    // Cross sparkles (+)
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(0, 9);
    ctx.moveTo(-9, 0); ctx.lineTo(9, 0);
    ctx.stroke();

    ctx.restore();
  }

  // ── timeline ───────────────────────────────────────────────────
  var start = performance.now();

  function tick() {
    var ms = (performance.now() - start) % CYCLE_MS;

    // Compute current state
    var foilProgress = -1;
    if (ms >= 0 && ms < 1800) foilProgress = ms / 1800;

    var gleamAlpha = 0, gleamScale = 0.2;
    if (ms >= 1550 && ms < 2200) {
      var gT = (ms - 1550) / 650;
      if (gT < 0.35) {
        gleamAlpha = gT / 0.35;
        gleamScale = 0.2 + (gT / 0.35) * 0.8;
      } else {
        gleamAlpha = 1 - (gT - 0.35) / 0.65;
        gleamScale = 1 + ((gT - 0.35) / 0.65) * 0.5;
      }
    }

    var rotation = 0;
    var zoom = 1;
    var gemPulseScale = 1;
    var gemHaloAlpha = 0.5;
    var auraAlpha = 0.7;

    if (ms >= 2300 && ms < 6300) {
      var sT = (ms - 2300) / 4000;
      if (sT < 0.18) {
        rotation = (sT / 0.18) * (Math.PI / 2);
        zoom = 1 + (sT / 0.18) * 0.04;
      } else if (sT < 0.30) {
        rotation = (Math.PI / 2) + ((sT - 0.18) / 0.12) * (Math.PI / 2);
        zoom = 1.04 + ((sT - 0.18) / 0.12) * 0.11;
      } else if (sT < 0.42) {
        rotation = Math.PI;
        zoom = 1.15 + ((sT - 0.30) / 0.12) * 0.20;
      } else if (sT < 0.65) {
        rotation = Math.PI;
        zoom = 1.35;
        // Double-beat gem pulse
        var b1 = Math.exp(-Math.pow((sT - 0.47) / 0.04, 2));
        var b2 = Math.exp(-Math.pow((sT - 0.58) / 0.04, 2));
        var beat = Math.max(b1, b2);
        gemPulseScale = 1 + beat * 0.25;
        gemHaloAlpha = 0.5 + beat * 0.5;
        auraAlpha = 0.7 + beat * 0.25;
      } else if (sT < 0.78) {
        rotation = Math.PI;
        zoom = 1.35 - ((sT - 0.65) / 0.13) * 0.20;
      } else if (sT < 0.88) {
        rotation = Math.PI + ((sT - 0.78) / 0.10) * (Math.PI / 2);
        zoom = 1.15 - ((sT - 0.78) / 0.10) * 0.11;
      } else {
        rotation = (1.5 * Math.PI) + ((sT - 0.88) / 0.12) * (Math.PI / 2);
        zoom = 1.04 - ((sT - 0.88) / 0.12) * 0.04;
      }
    }

    // ── paint ────────────────────────────────────────────────────
    ctx.clearRect(0, 0, SIZE, SIZE);
    drawAura(auraAlpha);

    var scaleX = Math.cos(rotation);
    var showingFront = scaleX >= 0;

    ctx.save();
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.scale(scaleX * zoom, zoom);
    ctx.translate(-SIZE / 2, -SIZE / 2);

    if (showingFront) {
      drawFront();
      if (foilProgress >= 0) drawFoilSheen(foilProgress);
      if (gleamAlpha > 0)    drawGleam(gleamScale, gleamAlpha);
    } else {
      drawBack(gemPulseScale, gemHaloAlpha);
    }

    ctx.restore();

    link.href = canvas.toDataURL('image/png');
  }

  tick();
  setInterval(tick, 80); // ~12fps — plenty for a tab, light on battery
})();
