// Icon giao diện (nút menu, tiền tệ, cài đặt...) vẽ bằng bản đồ ký tự.
import { OUT, TAU, Pix, FIX } from './pix.js';
import { drawPaw, drawCoin } from './items.js';

// ================= ICON GIAO DIỆN (16x16) =================
const UI_PAL = Object.assign({}, FIX, {
  1: '#5d3a1a', 2: '#8d5a2b', 3: '#c08040', 4: '#e8b26a', 5: '#ffe0a0', // da/gỗ
  a: '#7a1b1b', A: '#c62828', d: '#ff5252', // đỏ
  m: '#0d47a1', M: '#1e88e5', N: '#64b5f6', // xanh dương
  l: '#1b5e20', L: '#43a047', i: '#a5d6a7', // xanh lá
  f: '#ffe0c0', F: '#e8b48a', // da người
  t: '#6a1b9a', U: '#ab47bc', // tím
});

const UI_MAPS = {
  bag: [
    '................',
    '......GgG.......',
    '.....g...g......',
    '....2GGGGG2.....',
    '...23444443 2...',
    '..2344544443 2..',
    '.234455444443 2.',
    '.234454444443 2.',
    '.234444YY44432..',
    '.23444YGGY4432..',
    '.234444YY44432..',
    '.233444444433 2.',
    '..2233333332 2..',
    '...222222222....',
    '................',
    '................',
  ],
  char: [
    '................',
    '.....111111.....',
    '....1222222 1....',
    '...122222222 1...',
    '...AAAAAAAAAAd..',
    '...1ffffffff1Ad.',
    '...1fKfffKff1.d.',
    '...1ffffffff1...',
    '....1ffaaff1....',
    '.....111111.....',
    '...MMMM..MMMM...',
    '..MNMMMwwMMMNM..',
    '.MNMMMMwwMMMMNM.',
    '.MNMMMMMMMMMMNM.',
    '................',
    '................',
  ],
  skill: [
    '................',
    '..........12....',
    '.........1342...',
    '........134 42..',
    '.......1PPP442..',
    '......1PPPPP 2...',
    '.....1PxPPP1....',
    '....1PPPxP1.....',
    '...1PxPPP1......',
    '..AAPPPx1.......',
    '.AdA PP1........',
    '.AAA 11.........',
    '..A.............',
    '................',
    '................',
    '................',
  ],
  quest: [
    '................',
    '.1222222222221..',
    '.2PPPPPPPPPPP2..',
    '..PPPPPAAPPPP...',
    '..PPPPAddAPPP...',
    '..PxxxAddAPPP...',
    '..PPPPAddAPPP...',
    '..PxxxPAAPPPP...',
    '..PPPPPPPPPPP...',
    '..PxxxPPAAPPP...',
    '..PPPPPAddAPP...',
    '..PPPPPPAAPPP...',
    '.2PPPPPPPPPPP2..',
    '.1222222222221..',
    '................',
    '................',
  ],
  party: [
    '................',
    '..........111...',
    '.........1fff1..',
    '....111..1fKf1..',
    '...1fff1.1fff1..',
    '...1fKf1..111...',
    '...1fff1.1LLL1..',
    '....111.1LiLLL1.',
    '...1MMM11LLLLL1.',
    '..1MNMMM1LLLLL1.',
    '..1MNMMMM1LLLL1.',
    '..1MMMMMM1.....',
    '..1MMMMMM1......',
    '...111111.......',
    '................',
    '................',
  ],
  friends: [
    '................',
    '................',
    '...aaa...aaa....',
    '..aAddA.aAAAa...',
    '.aAdwdAaAAAAAa..',
    '.aAddAAAAAAAAa..',
    '.aAAAAAAAAAAAa..',
    '.aAAAAAAAAAAAa..',
    '..aAAAAAAAAAa...',
    '...aAAAAAAAa....',
    '....aAAAAAa.....',
    '.....aAAAa......',
    '......aAa.......',
    '.......a........',
    '................',
    '................',
  ],
  clan: [
    '................',
    '.GY.............',
    '.gG.aaaaaaaaa...',
    '.12.AAAAAAAAAa..',
    '.12.AdAAGGAAAa..',
    '.12.AAAGYYGAAa..',
    '.12.AAAGYYGAAa..',
    '.12.AAAAGGAAAa..',
    '.12.AAAAAAAAa...',
    '.12.AAAAAAAAAa..',
    '.12.aaaaaaaaaa..',
    '.12.............',
    '.12.............',
    '.12.............',
    'g111g...........',
    '................',
  ],
  rank: [
    '................',
    '..GGGGGGGGGGG...',
    '.gGYYYGGGGGGgg..',
    'gggYYGGGGGGGg.g.',
    'g.gYGGGGGGGGg.g.',
    'g.gYGGGGGGGGg.g.',
    '.gggGGGGGGGgg g.',
    '...gGGGGGGGg....',
    '....gGGGGGg.....',
    '.....ggGgg......',
    '......gGg.......',
    '......gGg.......',
    '....11111 11....',
    '....1AAdAA1.....',
    '...111111111....',
    '................',
  ],
  map: [
    '................',
    '..PPPPnPPPPnPP..',
    '.pPPPnnPPPnnPPp.',
    '.pPLLnPPPPnPPPp.',
    '.pPLLLPP.PnP.Pp.',
    '.pPPLnP.PPn.PPp.',
    '.pPPPnPPPPnPPAd.',
    '.pP.PnPPPPnPAdA.',
    '.pPP.nPPMMnPdAP.',
    '.pPPPnPMMMnPPPp.',
    '.pPPPnPPMMnPPPp.',
    '.pPPnnPPPnnPPPp.',
    '..ppppnppppnpp..',
    '................',
    '................',
    '................',
  ],
  // phong thư kem, nắp chữ V, dấu sáp đỏ
  mail: [
    '................',
    '................',
    '..PPPPPPPPPPPP..',
    '.PnPPPPPPPPPPnP.',
    '.PPnPPPPPPPPnPP.',
    '.PPPnPPPPPPnPPP.',
    '.PPPPnPPPPnPPPP.',
    '.PPPPPnAAnPPPPP.',
    '.PPPPPAddAPPPPP.',
    '.PPPPPAdAAPPPPP.',
    '.PPPPnnAAnnPPPP.',
    '.PPnnPPPPPPnnPP.',
    '.pnppppppppppnp.',
    '.pppppppppppppp.',
    '................',
    '................',
  ],
  // đèn ông sao (biểu ngữ sự kiện theo mùa)
  festival: [
    '.......g........',
    '.......g........',
    '.......A........',
    '......AdA.......',
    '.....AdYdA......',
    'AAAAAAdYYdAAAAAA',
    '.AdddYYGYYYdddA.',
    '..AdddYYYYdddA..',
    '...AddYYYYddA...',
    '...AddAddAddA...',
    '..AddA....AddA..',
    '..AdA......AdA..',
    '.AdA........AdA.',
    '.AA..........AA.',
    '................',
    '................',
  ],
  gift: [
    '................',
    '...AA....AA.....',
    '..AddA..AddA....',
    '..AAdAAAAdAA....',
    '....AAAAAA......',
    '.GGGGGAAGGGGGG..',
    '.GYYYYAAYYYYYG..',
    '.gGGGGAAGGGGGg..',
    '..MMMMAAMMMMM...',
    '..MNNMAAMMMMM...',
    '..MNMMAAMMMMM...',
    '..MMMMAAMMMMM...',
    '..MMMMAAMMMMM...',
    '..mmmmaammmmm...',
    '................',
    '................',
  ],
  wheel: [
    '.......dA.......',
    '.......AA.......',
    '.....11a111.....',
    '...11GAAAMM11...',
    '..1GGGAAAMMMM1..',
    '..1GGGGAMMMMM1..',
    '.1LLLGGAMMMLLL1.',
    '.1LLLLLYYLLLLL1.',
    '.1MMMLLYYLLAAA1.',
    '.1MMMMGLGAAAAA1.',
    '..1MMMGGGAAAA1..',
    '..1MMGGGGGAAA1..',
    '...11GGGGGG11...',
    '.....111111.....',
    '......1jj1......',
    '.....1jjjj1.....',
  ],
  settings: [
    '................',
    '......TT........',
    '...T..TSS..T....',
    '..TTSTTSSTSST...',
    '...TSSSSSSSS....',
    '..TSSSs..sSSS...',
    'TTTSSs....sSSTT.',
    'TSSSS......SSSS.',
    '.SSSSs....sSSss.',
    '..SSSSs..sSSSs..',
    '...SSSSSSSSSs...',
    '..TSSsSSSSsSSs..',
    '..Ss..SSs..ss...',
    '......Sss.......',
    '................',
    '................',
  ],
  auto: [
    '................',
    '.....LLLLLL.....',
    '...LLiiiiiLLL...',
    '..LiL......iLi..',
    '..Li.....T..LLL.',
    '.Li.....TS..LiL.',
    '.Li....TS...iL..',
    '.L....TS.....L..',
    '..L..TS......iL.',
    '.LiL.GG.....iL..',
    '.LLL.hG....iL...',
    '..LiL....iiLL...',
    '...LLLiiiiLL....',
    '.....LLLLLL.....',
    '................',
    '................',
  ],
  pk: [
    '................',
    '....TTTTTTT.....',
    '...TTTTTTTTT....',
    '..TTTTTTTTTTS...',
    '..TTTTTTTTTTS...',
    '..TKKKTTTKKKS...',
    '..TKdKTTTKdKS...',
    '..TKKKTSTKKKS...',
    '...TTTTKTTTS....',
    '....TSTSTST.....',
    '....TTTTTTS.....',
    '.TT..SSSSS..TT..',
    '..TTT.....TTT...',
    '.....TTTTT......',
    '..TTT.....TTT...',
    '.TT.........TT..',
  ],
  // lôi đài xếp hạng: hai kiếm bắt chéo sau khiên tròn đỏ có sao vàng
  arena: [
    '................',
    '.TT..........TT.',
    '.TST........TST.',
    '..TST......TST..',
    '...TST....TST...',
    '....TST..TST....',
    '.....TaaaaT.....',
    '....aAAAAAAa....',
    '....aAAGYAAa....',
    '....aAGYYGAa....',
    '...gaAAGGAAag...',
    '..GG.aAAAAa.GG..',
    '..hGg.aaaa.gGh..',
    '.hkh........hkh.',
    '.hh..........hh.',
    '................',
  ],
  chat: [
    '................',
    '..TTTTTTTTTTT...',
    '.TTTTTTTTTTTTT..',
    '.TTsssssssssTT..',
    '.TTTTTTTTTTTTT..',
    '.TTsssssssTTTT..',
    '.TTTTTTTTTTTTT..',
    '.TTssssssssTTT..',
    '.TTTTTTTTTTTTT..',
    '..TTTTTTTTTTT...',
    '...TTT..........',
    '...TT...........',
    '...T............',
    '................',
    '................',
    '................',
  ],
  talk: [
    '................',
    '..YYYYYYYYYYY...',
    '.YYGGGGGGGGGYY..',
    '.YGGGGGGGGGGGY..',
    '.YGGGGGGGGGGGY..',
    '.YGhhGGhhGGhhG..',
    '.YGhhGGhhGGhhG..',
    '.YGGGGGGGGGGGY..',
    '.YGGGGGGGGGGGg..',
    '..gGGGGGGGGGg...',
    '.....gGGg.......',
    '......gGg.......',
    '.......gg.......',
    '................',
    '................',
    '................',
  ],
  pick: [
    '................',
    '......ff........',
    '.....fFFf.ff....',
    '.....fFFffFFf...',
    '..ff.fFFfFFFf...',
    '.fFFffFFfFFFff..',
    '.fFFfFFFfFFfFFf.',
    '..fFFFFFFFFfFFf.',
    '..fFFFFFFFFFFFf.',
    '...fFFFFFFFFFf..',
    '...fFFFFFFFFFf..',
    '....fFFFFFFFf...',
    '....AAAAAAAA....',
    '....AdddddAA....',
    '................',
    '................',
  ],
  target: [
    '................',
    '.......A........',
    '.....AAAAA......',
    '....AwwwwwA.....',
    '...AwAAAAAwA....',
    '..AwAwwwwwAwA...',
    '..AwAwAAAwAwA...',
    '.AAwAwAdAwAwAA..',
    '..AwAwAAAwAwA...',
    '..AwAwwwwwAwA...',
    '...AwAAAAAwA....',
    '....AwwwwwA.....',
    '.....AAAAA......',
    '.......A........',
    '................',
    '................',
  ],
  attack: [
    '................',
    '.............TT.',
    '............TST.',
    '...........TSs..',
    '..........TSs...',
    '.........TSs....',
    '........TSs.....',
    '.......TSs......',
    '..g...TSs.......',
    '..Gg.TSs........',
    '...GGSs.........',
    '...hGGg.........',
    '..hkhgGG........',
    '.hkh...g........',
    '.Gh.............',
    '................',
  ],
  close: [
    '................',
    '................',
    '..aaa.....aaa...',
    '..adAa...aAAa...',
    '...adAa.aAAa....',
    '....adAaAAa.....',
    '.....adAAa......',
    '......aAAa......',
    '.....aAAAAa.....',
    '....aAAa.aAAa...',
    '...aAAa...aAAa..',
    '..aAAa.....aAAa.',
    '..aaa.......aaa.',
    '................',
    '................',
    '................',
  ],
  // Tà Thú: mặt quỷ sừng trắng, mắt vàng (sự kiện, boss sự kiện)
  beast: [
    '................',
    '.T............T.',
    '.ST..........TS.',
    '..ST.aaaaaa.TS..',
    '...SaAAAAAAaS...',
    '...aAAAAAAAAa...',
    '..aAAAAAAAAAAa..',
    '..aAGGAAAAGGAa..',
    '..aAAYGAAGYAAa..',
    '..aaAAAAAAAAaa..',
    '...aAAAaaAAAa...',
    '...aAwaAAawAa...',
    '....aAwAAwAa....',
    '.....aaaaaa.....',
    '................',
    '................',
  ],
  // bị làm chậm do chiêu boss: ốc sên
  slow: [
    '................',
    '................',
    '.......2222.....',
    '.....22333322...',
    '....2334444332..',
    '...233422224332.',
    '...23422..22432.',
    '...2342.24.2432.',
    '.i.2342.22.2432.',
    '.Li.23442..2432.',
    '.LLi.2344444332.',
    '.LwLi.222222222.',
    '.LLLLLLLLLLLLLL.',
    '..iiiiiiiiiiii..',
    '................',
    '................',
  ],
  // tìm đường: cột mốc đỏ cuối chuỗi dấu chân vàng
  path: [
    '.........aAAAa..',
    '........aAdddAa.',
    '........AdwwddA.',
    '........AdwwddA.',
    '........aAdddAa.',
    '.........aAAAa..',
    '..........aAa...',
    '...........a....',
    '.....GG.........',
    '....GYYg..GG....',
    '....gGGg.GYYg...',
    '.GG..gg..gGGg...',
    'GYYg......gg....',
    'gGGg............',
    '.gg.............',
    '................',
  ],
};

function drawLuong(P) {
  // viên ngọc xanh (lượng)
  const rows = [[2, 5, 10], [3, 3, 12], [4, 2, 13], [5, 1, 14], [6, 2, 13], [7, 3, 12], [8, 4, 11], [9, 5, 10], [10, 6, 9], [11, 7, 8]];
  for (const [y, x0, x1] of rows) {
    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / Math.max(1, x1 - x0);
      let c;
      if (y <= 4) c = u < 0.3 ? '#e1f5fe' : u < 0.6 ? '#81d4fa' : '#29b6f6';
      else if (y === 5) c = '#b3e5fc';
      else c = u < 0.3 ? '#4fc3f7' : u < 0.6 ? '#0288d1' : '#01579b';
      P.set(x, y + 1, c);
    }
  }
  P.rect(5, 4, 2, 1, '#ffffff');
  P.set(4, 5, '#ffffff');
  P.line(5, 8, 7, 11, '#b3e5fc');
  P.set(13, 2, '#ffffff');
  P.set(12, 2, '#b3e5fc');
  P.set(14, 2, '#b3e5fc');
  P.set(13, 1, '#b3e5fc');
  P.set(13, 3, '#b3e5fc');
}

function drawSettings(P) {
  const cx = 7.5;
  const cy = 7.5;
  P.fill(0, 0, 15, 15, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    const a = Math.atan2(dy, dx);
    const tooth = Math.cos(a * 8) > 0.15;
    const R = tooth ? 7 : 5.4;
    if (r > R || r < 2.2) return null;
    const lit = (-dx - dy) / 8;
    if (r < 3.4) return '#546e7a';
    return lit > 0.25 ? '#eceff1' : lit > -0.25 ? '#b0bec5' : '#78909c';
  });
}

function drawWheel(P) {
  const cx = 7.5;
  const cy = 8;
  const cols = ['#e53935', '#ffd54f', '#43a047', '#1e88e5', '#ab47bc', '#ff9800'];
  P.fill(0, 1, 15, 15, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > 6.8) return null;
    if (r > 5.8) return r > 6.3 ? '#9a6a12' : '#f2c230';
    if (r < 1.4) return '#fff3a0';
    const a = Math.atan2(dy, dx) + Math.PI;
    const k = Math.floor((a / TAU) * 6) % 6;
    return cols[k];
  });
  P.map(['.ww.', '.Rr.', '..r.'], { w: '#ffffff', R: '#e53935', r: '#8e1b1b' }, 6, 0);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    P.set(cx + Math.cos(a) * 6.3, cy + Math.sin(a) * 6.3, '#fff3a0');
  }
}

function drawAuto(P) {
  // vòng mũi tên xoay + kiếm
  const cx = 7.5;
  const cy = 7.5;
  P.fill(0, 0, 15, 15, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > 7 || r < 5) return null;
    const a = Math.atan2(dy, dx);
    if ((a > -0.35 && a < 0.25) || (a > Math.PI - 0.35 || a < -Math.PI + 0.25)) return null;
    return r > 6.2 ? '#2e7d32' : '#69f0ae';
  });
  P.map(['ww.', 'wLw', '.L.'], { w: '#69f0ae', L: '#2e7d32' }, 12, 7);
  P.map(['.L.', 'wLw', '.ww'], { w: '#69f0ae', L: '#2e7d32' }, 1, 6);
  P.line(5, 10, 10, 5, '#eceff1');
  P.line(6, 10, 11, 5, '#90a4ae');
  P.set(10, 4, '#ffffff');
  P.line(4, 9, 6, 11, '#f2c230');
  P.set(4, 11, '#8d6e63');
  P.set(3, 12, '#5d4037');
}

// ----- Xu khóa & vật phẩm khóa
function drawLock(P) {
  // quai thép hình vòm: mép trái/trên sáng, mép phải tối
  P.rect(5, 1, 6, 2, '#cfd8dc');
  P.rect(4, 2, 2, 5, '#cfd8dc');
  P.rect(10, 2, 2, 5, '#78909c');
  P.set(10, 1, '#78909c');
  // thân sơn mài đỏ, bỏ 4 góc
  P.fill(2, 7, 13, 14, (_x, _y, x, y) => {
    if ((x === 2 || x === 13) && (y === 7 || y === 14)) return null;
    return y === 7 ? '#c62828' : y === 14 ? '#5a140a' : '#8e2414';
  });
  P.set(3, 8, '#f0c869');
  P.set(12, 8, '#f0c869');
  P.rect(7, 9, 2, 4, '#120804');
}

function drawXuk(P) {
  // đồng xu đồng đỏ (cùng công thức ánh sáng với đồng xu thường) + ổ khóa con góc dưới phải
  // tâm giữa ô 7 và 8 để lỗ vuông 2x2 nằm chính giữa
  const R = 6.5;
  P.fill(0, 0, 15, 15, (x, y, px, py) => {
    const dx = x - 8;
    const dy = y - 8;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > R) return null;
    if (px >= 7 && px <= 8 && py >= 7 && py <= 8) return null;
    if (px >= 6 && px <= 9 && py >= 6 && py <= 9) return '#6d3a12';
    const lit = (-dx - dy) / R;
    if (r > 5.3) return lit > 0 ? '#f0b27a' : '#8d4f22';
    return lit > 0.5 ? '#ffd1a6' : lit > -0.1 ? '#e0975a' : '#b46a32';
  });
  P.set(4, 4, '#ffffff');
  // viền tối tách ổ khóa khỏi mặt xu
  P.rect(8, 10, 1, 6, OUT);
  P.rect(9, 9, 2, 1, OUT);
  P.rect(13, 9, 2, 1, OUT);
  P.rect(11, 10, 2, 1, OUT);
  P.set(9, 10, OUT);
  P.set(14, 10, OUT);
  P.set(11, 9, '#cfd8dc');
  P.set(12, 9, '#cfd8dc');
  P.set(10, 10, '#cfd8dc');
  P.set(13, 10, '#cfd8dc');
  P.rect(9, 11, 6, 5, '#8e2414');
  P.rect(9, 11, 6, 1, '#c62828');
  P.set(11, 13, '#ffe082');
  P.set(12, 13, '#ffe082');
}

const uiCache = new Map();
export function uiIconURL(name) {
  if (uiCache.has(name)) return uiCache.get(name);
  const P = new Pix(16, 16);
  switch (name) {
    case 'xu': drawCoin(P, true); break;
    case 'luong': drawLuong(P); break;
    case 'settings': drawSettings(P); break;
    case 'wheel': drawWheel(P); break;
    case 'auto': drawAuto(P); break;
    case 'pet': drawPaw(P, '#ffb74d'); break;
    case 'lock': drawLock(P); break;
    case 'xuk': drawXuk(P); break;
    default: {
      const m = UI_MAPS[name];
      if (m) P.map(m, UI_PAL);
      else {
        P.rect(4, 4, 8, 8, '#e8c271');
        P.rect(4, 4, 8, 2, '#fff3a0');
      }
    }
  }
  P.outline(OUT);
  const u = P.canvas().toDataURL();
  uiCache.set(name, u);
  return u;
}
