// Race stadium decor.
// Visual-only layer for stands, ad boards and finish arch. No track geometry or physics.

window.SKACHKI_RACE_STADIUM_DECOR = (function () {
  function drawBack(g, track, width, outerX, outerY, outerW, outerH) {
    var standW = Math.min(width * 0.7, outerW * 0.86);
    var standX = track.cx - standW / 2;
    var standY = Math.max(8, outerY - 96);
    var sideH = Math.min(outerH * 0.52, 152);
    var i;

    g.fillStyle(0x07111d, 0.66).fillRoundedRect(standX - 12, standY - 8, standW + 24, 70, 15);
    g.fillStyle(0xb9c2ca, 0.72).fillRoundedRect(standX, standY, standW, 50, 10);
    g.fillStyle(0x101a24, 0.74).fillRoundedRect(standX + 12, standY + 12, standW - 24, 26, 7);
    g.fillStyle(0x07111d, 0.88).fillRoundedRect(track.cx - 48, standY + 4, 96, 42, 8);
    g.fillStyle(0xd6a23d, 0.84).fillRoundedRect(track.cx - 30, standY + 19, 60, 12, 4);

    for (i = 0; i < 46; i++) {
      g.fillStyle(i % 4 === 0 ? 0xd24a35 : 0xf2d7a5, 0.64)
        .fillCircle(standX + 20 + i * (standW - 40) / 45, standY + 18 + (i % 3) * 6, 1.8);
    }

    drawSideStand(g, outerX - 58, track.cy - sideH / 2, 42, sideH, true);
    drawSideStand(g, outerX + outerW + 16, track.cy - sideH / 2, 42, sideH, false);
  }

  function drawSideStand(g, x, y, w, h, leftSide) {
    var i;
    var cx;

    g.fillStyle(0x07111d, 0.42).fillRoundedRect(x - 5, y - 6, w + 10, h + 12, 10);
    g.fillStyle(0x87949e, 0.58).fillRoundedRect(x, y, w, h, 9);
    g.fillStyle(0x111923, 0.58).fillRoundedRect(x + 7, y + 10, w - 14, h - 20, 6);

    for (i = 0; i < 18; i++) {
      cx = leftSide ? x + 13 + (i % 2) * 12 : x + w - 13 - (i % 2) * 12;
      g.fillStyle(i % 3 ? 0xf3d7a7 : 0x2f83ff, 0.56).fillCircle(cx, y + 18 + i * (h - 36) / 17, 1.7);
    }
  }

  function drawFront(g, track, outerX, outerY, outerW, outerH) {
    var boardY = outerY + outerH + 24;
    var topBoardY = Math.max(8, outerY - 25);
    var i;

    for (i = 0; i < 5; i++) {
      drawAdBoard(g, outerX + 24 + i * 76, topBoardY, 52 + (i % 2) * 14);
    }

    for (i = 0; i < 4; i++) {
      drawAdBoard(g, track.cx - 154 + i * 104, boardY, 76);
    }
  }

  function drawAdBoard(g, x, y, w) {
    g.fillStyle(0x06111f, 0.62).fillRoundedRect(x - 2, y - 2, w + 4, 16, 4);
    g.fillStyle(0x092238, 0.78).fillRoundedRect(x, y, w, 12, 3);
    g.lineStyle(1, 0xd6a23d, 0.42).strokeRoundedRect(x, y, w, 12, 3);
    g.fillStyle(0xd6a23d, 0.62).fillRect(x + 7, y + 5, Math.max(8, w - 14), 2);
  }

  function drawFinishArch(g, track, finishX) {
    var topY = track.cy - track.r - track.laneOuter - 12;
    var bottomY = track.cy - track.r + track.laneInner + 10;
    var archW = 28;

    g.lineStyle(3, 0x06111f, 0.72);
    g.lineBetween(finishX - archW / 2, topY, finishX - archW / 2, bottomY);
    g.lineBetween(finishX + archW / 2, topY, finishX + archW / 2, bottomY);
    g.lineBetween(finishX - archW / 2, topY, finishX + archW / 2, topY);

    g.lineStyle(1, 0xd6a23d, 0.78);
    g.lineBetween(finishX - archW / 2 + 2, topY + 3, finishX + archW / 2 - 2, topY + 3);
    g.fillStyle(0xd6a23d, 0.78).fillCircle(finishX, topY + 3, 3);
  }

  return {
    drawBack: drawBack,
    drawFinishArch: drawFinishArch,
    drawFront: drawFront
  };
})();
