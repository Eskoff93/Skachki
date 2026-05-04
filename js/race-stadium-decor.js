// Race stadium decor.
// Visual-only layer for stands, ad boards and finish arch. No track geometry or physics.

window.SKACHKI_RACE_STADIUM_DECOR = (function () {
  function drawBack(g, track, width, outerX, outerY, outerW, outerH) {
    var standW = Math.min(width * 0.74, outerW * 0.92);
    var standX = track.cx - standW / 2;
    var standY = Math.max(10, outerY - 92);
    var sideH = Math.min(outerH * 0.64, 190);
    var i;

    g.fillStyle(0x07111d, 0.78).fillRoundedRect(standX - 16, standY - 10, standW + 32, 86, 18);
    g.fillStyle(0xb9c2ca, 0.88).fillRoundedRect(standX, standY, standW, 62, 12);
    g.fillStyle(0x101a24, 0.86).fillRoundedRect(standX + 14, standY + 14, standW - 28, 34, 8);
    g.fillStyle(0x07111d, 0.96).fillRoundedRect(track.cx - 58, standY + 4, 116, 54, 9);
    g.fillStyle(0xd6a23d, 0.94).fillRoundedRect(track.cx - 36, standY + 23, 72, 15, 5);

    for (i = 0; i < 54; i++) {
      g.fillStyle(i % 4 === 0 ? 0xd24a35 : 0xf2d7a5, 0.78)
        .fillCircle(standX + 22 + i * (standW - 44) / 53, standY + 22 + (i % 4) * 6, 2.1);
    }

    drawSideStand(g, outerX - 74, track.cy - sideH / 2, 54, sideH, true);
    drawSideStand(g, outerX + outerW + 20, track.cy - sideH / 2, 54, sideH, false);
  }

  function drawSideStand(g, x, y, w, h, leftSide) {
    var i;
    var cx;

    g.fillStyle(0x07111d, 0.58).fillRoundedRect(x - 6, y - 8, w + 12, h + 16, 12);
    g.fillStyle(0x87949e, 0.8).fillRoundedRect(x, y, w, h, 10);
    g.fillStyle(0x111923, 0.72).fillRoundedRect(x + 8, y + 12, w - 16, h - 24, 7);

    for (i = 0; i < 22; i++) {
      cx = leftSide ? x + 17 + (i % 2) * 16 : x + w - 17 - (i % 2) * 16;
      g.fillStyle(i % 3 ? 0xf3d7a7 : 0x2f83ff, 0.72).fillCircle(cx, y + 20 + i * (h - 40) / 21, 2);
    }
  }

  function drawFront(g, track, outerX, outerY, outerW, outerH) {
    var boardY = outerY + outerH + 18;
    var topBoardY = Math.max(8, outerY - 18);
    var i;

    for (i = 0; i < 5; i++) {
      drawAdBoard(g, outerX + 22 + i * 82, topBoardY, 64 + (i % 2) * 18);
    }

    for (i = 0; i < 4; i++) {
      drawAdBoard(g, track.cx - 174 + i * 116, boardY, 92);
    }
  }

  function drawAdBoard(g, x, y, w) {
    g.fillStyle(0x06111f, 0.9).fillRoundedRect(x - 2, y - 2, w + 4, 20, 5);
    g.fillStyle(0x092238, 0.96).fillRoundedRect(x, y, w, 16, 4);
    g.lineStyle(1, 0xd6a23d, 0.58).strokeRoundedRect(x, y, w, 16, 4);
    g.fillStyle(0xd6a23d, 0.9).fillRect(x + 8, y + 6, Math.max(10, w - 16), 3);
    g.fillStyle(0xffffff, 0.38).fillRect(x + 10, y + 10, Math.max(8, w - 20), 2);
  }

  function drawFinishArch(g, track, finishX) {
    var topY = track.cy - track.r - track.laneOuter - 20;
    var bottomY = track.cy - track.r + track.laneInner + 18;
    var archW = 42;

    g.lineStyle(5, 0x06111f, 0.86);
    g.lineBetween(finishX - archW / 2, topY, finishX - archW / 2, bottomY);
    g.lineBetween(finishX + archW / 2, topY, finishX + archW / 2, bottomY);
    g.lineBetween(finishX - archW / 2, topY, finishX + archW / 2, topY);

    g.lineStyle(2, 0xd6a23d, 0.88);
    g.lineBetween(finishX - archW / 2 + 3, topY + 4, finishX + archW / 2 - 3, topY + 4);
    g.fillStyle(0xd6a23d, 0.9).fillCircle(finishX, topY + 4, 5);
  }

  return {
    drawBack: drawBack,
    drawFinishArch: drawFinishArch,
    drawFront: drawFront
  };
})();
