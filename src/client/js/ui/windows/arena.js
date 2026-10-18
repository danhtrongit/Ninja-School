// Lôi đài: viên trạng thái HUD, đếm ngược và cửa sổ kết quả trận (arenares)
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S, fmt } from '../../core/store.js';
import { sfx } from '../../core/sound.js';
import { $, h, ico } from '../dom.js';

export default {
  // ---------------- Lôi đài
  // Viên HUD giữa đáy: đang chờ ghép (thời gian chờ, nút hủy) hoặc đang đấu (đối thủ, đồng hồ, nút rời trận).
  // Đếm ngược 5 giây hiện số lớn giữa màn hình, không chặn thao tác.
  setArena(a) {
    const box = $('#hud-arena');
    const cd = $('#arena-cd');
    this.arenaInfo = a;
    this.arenaQuit = 0;
    // cảnh báo "Bấm lần nữa để rời" chỉ đúng khi nút Rời còn đó
    if (this.arenaQuitToast) {
      this.arenaQuitToast.remove();
      this.arenaQuitToast = null;
    }
    if (this.winName === 'rank' && this.rankTab === 'arena') this.refresh();
    if (!box) return;
    box.innerHTML = '';
    this.arenaEls = null;
    document.body.classList.toggle('ar-on', !!a);
    document.body.classList.toggle('ar-fight', !!a && a.st !== 'queue');
    if (!a) {
      box.classList.add('hidden');
      if (cd) {
        cd.classList.add('hidden');
        cd.textContent = '';
      }
      document.body.classList.remove('ar-go');
      return;
    }
    // vào trận: dọn thông báo cũ để số đếm ngược không bị che
    if (a.st === 'prep') $('#toasts').replaceChildren();
    const time = h('b', { class: 'ar-time' }, '');
    if (a.st === 'queue') {
      this.arenaEls = { time, n: h('span', { class: 'ar-n' }, '') };
      box.append(
        h('span', { class: 'ar-ico' }, ico('arena')),
        h('span', { class: 'ar-main' },
          h('span', { class: 'ar-top' }, h('span', { class: 'ar-title' }, 'Lôi đài'), time),
          h('span', { class: 'ar-sub' }, h('span', { class: 'ar-wait' }, 'Đang chờ', h('span', { class: 'ar-wx' }, ' ghép trận')), this.arenaEls.n)),
        h('button', { class: 'btn small ar-btn', title: 'Hủy đăng ký lôi đài', onclick: (e) => { e.stopPropagation(); sfx('click'); this.net.send('arenaCancel'); } }, 'Hủy'));
      box.className = 'queue';
    } else {
      const o = a.opp || { name: '?', lv: 0, elo: 0 };
      const quit = h('button', { class: 'btn small danger ar-btn', title: 'Rời trận (tính thua)' }, 'Rời');
      quit.onclick = (e) => {
        e.stopPropagation();
        sfx('click');
        // bấm 2 lần trong 3 giây mới rời, tránh bấm nhầm mất trận
        if (performance.now() - this.arenaQuit < 3000) {
          if (this.arenaQuitToast) this.arenaQuitToast.remove();
          this.arenaQuitToast = null;
          this.net.send('arenaLeave');
          return;
        }
        this.arenaQuit = performance.now();
        quit.textContent = 'Chắc?';
        quit.classList.add('ask');
        this.arenaQuitToast = this.toast('Rời trận sẽ tính thua. Bấm lần nữa để rời.', 'warn');
        setTimeout(() => {
          if (quit.isConnected) {
            quit.textContent = 'Rời';
            quit.classList.remove('ask');
          }
        }, 3000);
      };
      this.arenaEls = { time };
      const cls = S.G.classes[o.cls];
      box.append(
        h('span', { class: 'ar-ico' }, ico('arena')),
        h('span', { class: 'ar-main' },
          h('span', { class: 'ar-top' }, h('span', { class: 'ar-title' }, a.rated === false ? 'Giao hữu' : 'Lôi đài'), time),
          h('span', { class: 'ar-sub' }, h('span', { class: 'ar-vs' }, 'VS'), h('span', { class: 'ar-opp' }, o.name),
            h('span', { class: 'ar-oinfo' }, `Lv${o.lv}${cls ? ` ${cls.name}` : ''} · ${fmt(o.elo)}`))),
        a.st === 'end' ? null : quit);
      box.className = a.st;
    }
    this.arenaTick(performance.now());
  },

  arenaTick(now) {
    const a = this.arenaInfo;
    const els = this.arenaEls;
    if (!a || !els) return;
    const since = now - a.at;
    const mmss = (ms) => {
      const s = Math.max(0, Math.ceil(ms / 1000));
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };
    let txt = '';
    if (a.st === 'queue') txt = mmss((a.wait || 0) + since);
    else if (a.st === 'prep') txt = 'Chuẩn bị';
    else if (a.st === 'fight') txt = mmss((a.left || 0) - since);
    else txt = 'Kết thúc';
    if (els.time.textContent !== txt) els.time.textContent = txt;
    els.time.classList.toggle('ending', a.st === 'fight' && (a.left || 0) - since < 30000);
    if (els.n) {
      const n = a.n > 1 ? `· ${a.n} người chờ` : '';
      if (els.n.textContent !== n) els.n.textContent = n;
    }
    // số đếm ngược lớn: 5..1 lúc chuẩn bị, "ĐẤU!" trong 1 giây đầu trận
    const cd = $('#arena-cd');
    if (!cd) return;
    let big = '';
    if (a.st === 'prep') big = String(Math.max(1, Math.ceil(((a.left || 0) - since) / 1000)));
    else if (a.st === 'fight' && since < 1000) big = 'ĐẤU!';
    if (cd.textContent !== big) {
      cd.textContent = big;
      cd.classList.toggle('go', big === 'ĐẤU!');
      document.body.classList.toggle('ar-go', big === 'ĐẤU!');
      cd.classList.toggle('hidden', !big);
      if (big) {
        // chạy lại hiệu ứng phóng to mỗi số
        cd.classList.remove('pop');
        void cd.offsetWidth;
        cd.classList.add('pop');
        sfx(big === 'ĐẤU!' ? 'boss' : 'spin');
      }
    }
  },

  showArenaResult(m) {
    this.arenaRes = m;
    sfx(m.res === 'win' ? 'quest' : m.res === 'lose' ? 'die' : 'coin');
    // không chen ngang giao dịch/cường hóa (trận có thể kết thúc khi đối thủ rời lúc mình đang ở chỗ khác)
    if (!this.winName || ['rank', 'arenares', 'map', 'quest', 'char'].includes(this.winName)) this.open('arenares');
    const lab = m.nc ? 'Trận không tính' : { win: 'Thắng', lose: 'Thua', draw: 'Hòa' }[m.res] || '';
    this.toast(`Lôi đài: ${lab}${m.rated ? ` (${m.d >= 0 ? '+' : ''}${m.d} điểm)` : ''}`, m.res === 'win' && !m.nc ? 'reward' : 'info');
  },

  renderArenaRes() {
    const r = this.arenaRes;
    if (!r) return this.close();
    const A = S.G.arena || {};
    const res = ['win', 'lose', 'draw'].includes(r.res) ? r.res : 'draw';
    const big = { win: 'THẮNG', lose: 'THUA', draw: 'HÒA' }[res];
    const why = {
      ko: res === 'win' ? 'Hạ gục đối thủ' : 'Bị hạ gục',
      time: res === 'draw' ? 'Hết giờ, sinh lực hai bên bằng nhau' : `Hết giờ · sinh lực còn ${r.hp}% so với ${r.ohp}%`,
      leave: res === 'win' ? 'Đối thủ rời trận' : 'Bạn đã rời trận',
      dc: res === 'win' ? 'Đối thủ mất kết nối' : 'Mất kết nối',
    }[r.reason] || '';
    const cls = r.opp && S.G.classes[r.opp.cls];
    const d = r.d || 0;
    const head = h('div', { class: `arr-head r-${res}` },
      h('span', { class: 'arr-badge' }, ico('arena')),
      h('div', { class: 'arr-main' },
        h('div', { class: 'arr-big' }, big),
        h('div', { class: 'muted' }, `Đối thủ ${r.opp ? r.opp.name : '?'}${r.opp ? ` · Lv${r.opp.lv}${cls ? ` ${cls.name}` : ''}` : ''}`),
        h('div', { class: 'arr-why' }, why)));
    const elo = r.nc
      ? h('div', { class: 'arr-elo muted' }, 'Trận không tính: chưa bên nào ra đòn, điểm và số trận không đổi.')
      : r.rated
      ? h('div', { class: 'arr-elo' },
        h('span', { class: 'muted' }, 'Điểm lôi đài'),
        h('b', { class: 'arr-from' }, fmt(r.before)), h('span', { class: 'arr-arrow' }, '→'), h('b', null, fmt(r.elo)),
        h('span', { class: `arr-d ${d > 0 ? 'good' : d < 0 ? 'bad' : 'muted'}` }, `${d > 0 ? '+' : ''}${d}`))
      : h('div', { class: 'arr-elo muted' }, `Trận giao hữu: hai bạn đã đấu ${A.pairDaily || 3} trận tính điểm hôm nay, điểm không đổi.`);
    const gains = [];
    if (r.xu) gains.push(h('span', { class: 'arr-gain' }, ico('xu'), `+${fmt(r.xu)} xu`));
    if (r.fame) gains.push(h('span', { class: 'arr-gain' }, ico('rank'), `+${r.fame} danh vọng`));
    const reward = gains.length ? h('div', { class: 'arr-rw' }, ...gains)
      : h('div', { class: 'arr-rw muted' }, r.lock ? `Bỏ trận: chờ ${Math.round(r.lock / 1000)} giây mới đăng ký lại được.` : r.quit ? 'Rời trận: không có thưởng.' : r.rated ? `Đã đủ ${A.daily || 20} trận có thưởng hôm nay.` : 'Không có thưởng.');
    const streak = res === 'win' && r.streak >= 2 ? h('div', { class: 'arr-streak' }, `Chuỗi ${r.streak} trận thắng!`) : null;
    const again = h('button', { class: 'btn primary', onclick: () => { sfx('click'); this.net.send('arenaJoin'); this.close(); } }, 'Đấu trận mới');
    this.frameWin('Kết Quả Lôi Đài', h('div', { class: 'arr' }, head, elo, reward, streak),
      h('div', { class: 'arr-foot' },
        h('button', { class: 'btn', onclick: () => { this.rankTab = 'arena'; this.open('rank'); } }, 'Bảng xếp hạng'),
        S.arena && S.arena.st === 'queue' ? h('span', { class: 'muted' }, 'Đang chờ trận mới...') : again,
        h('button', { class: 'btn', onclick: () => this.close() }, 'Đóng')));
  },
};
