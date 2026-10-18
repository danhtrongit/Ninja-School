// Cửa sổ Cài đặt (settings)
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S, saveSettings } from '../../core/store.js';
import { applyAudio, audioInfo, sfx } from '../../core/sound.js';
import { h } from '../dom.js';
import { skImg } from '../common.js';

export default {
  // ----- Cài đặt
  renderSettings() {
    const st = S.settings;
    const num = (k, label, min, max) => h('label', { class: 'set-row' }, h('span', null, label),
      h('input', { type: 'number', min, max, value: st[k], class: 'in short', onchange: (e) => { st[k] = Math.max(min, Math.min(max, +e.target.value)); saveSettings(); } }));
    const chk = (k, label) => h('label', { class: 'set-row' }, h('span', null, label),
      h('input', { type: 'checkbox', class: 'switch', checked: st[k], onchange: (e) => { st[k] = e.target.checked; saveSettings(); } }));
    const key = (k, d) => h('div', { class: 'key-row' }, h('kbd', null, k), h('span', null, d));
    // áp dụng ngay vào game (lớp ngày/đêm, rung màn hình) rồi lưu
    const apply = () => { saveSettings(); if (this.game && this.game.applySettings) this.game.applySettings(); };
    const seg = (k, label, opts) => h('div', { class: 'set-row' }, h('span', null, label),
      h('div', { class: 'set-seg', role: 'radiogroup', 'aria-label': label }, ...opts.map(([v, txt]) => h('button', {
        class: `btn small${st[k] === v ? ' primary' : ''}`, role: 'radio', 'aria-checked': String(st[k] === v),
        onclick: () => { st[k] = v; apply(); this.refresh(); },
      }, txt))));
    // thanh âm lượng 0-100: đổi là nghe ngay, lưu khi thả tay
    const slider = (k, label) => {
      const out = h('b', { class: 'vol-n' }, String(st[k]));
      return h('label', { class: 'set-row vol-row' }, h('span', null, label),
        h('input', { type: 'range', min: 0, max: 100, step: 5, value: st[k], class: 'vol', 'data-vol': k, 'aria-label': label,
          oninput: (e) => { st[k] = +e.target.value; out.textContent = String(st[k]); applyAudio(); },
          onchange: () => { saveSettings(); if (k === 'sfxVol') sfx('click'); } }), out);
    };
    const snd = chk('sound', 'Âm thanh');
    snd.querySelector('input').addEventListener('change', applyAudio);
    const au = audioInfo();
    const lit = seg('daynight', 'Ngày/đêm', [[0, 'Tắt'], [0.5, 'Nhẹ'], [1, 'Đầy đủ']]);
    const shake = chk('shake', 'Rung màn hình');
    shake.querySelector('input').addEventListener('change', apply);
    this.frameWin('Cài Đặt', h('div', { class: 'set-wrap' },
      h('div', { class: 'sec' }, h('div', { class: 'sec-title' }, 'Tự động đánh'), num('autoHp', 'Tự uống HP khi dưới (%)', 0, 95), num('autoMp', 'Tự uống MP khi dưới (%)', 0, 95), num('autoRange', 'Phạm vi tìm quái', 100, 2000), chk('autoPick', 'Tự nhặt đồ')),
      this.autoPlusSec(seg, num, chk),
      h('div', { class: 'sec' }, h('div', { class: 'sec-title' }, 'Hiển thị & âm thanh'), chk('names', 'Hiện tên người chơi'), snd, slider('musicVol', 'Nhạc nền'), slider('sfxVol', 'Hiệu ứng'), lit, shake,
        h('div', { class: 'muted tiny' }, 'Trời sáng tối theo giờ Việt Nam. Màn hình rung khi trúng đòn boss hoặc hạ boss.'),
        au.sfx ? h('div', { class: 'muted tiny audio-credit' }, 'Tiếng hiệu ứng: Powered by Stability AI.') : null),
      h('div', { class: 'sec' }, h('div', { class: 'sec-title' }, 'Mã quà tặng'), this.codeBox(),
        h('div', { class: 'muted tiny' }, `Mỗi mã dùng 1 lần cho mỗi tài khoản. Hành trang đầy thì quà được gửi vào Hộp Thư${this.touch ? '' : ' (L)'}.`)),
      h('div', { class: 'sec help' }, h('div', { class: 'sec-title' }, 'Điều khiển'),
        key('A / D', 'Di chuyển (hoặc ← →)'), key('W / Space', 'Nhảy, nhấn 2 lần để nhảy đôi · S+Space: xuống bục'),
        key('J', 'Đánh thường'), key('1 - 6', 'Kỹ năng (nhấn giữ nút kỹ năng để đổi)'), key('T', 'Tự tìm đường tới nhiệm vụ'), key('Q / E', 'Bình HP / MP'), key('Z / X', 'Nhặt đồ / nói chuyện, vào cửa'), key('Tab', 'Đổi mục tiêu'), key('F', 'Tự động đánh'),
        key('B C V N', 'Túi đồ · Nhân vật · Kỹ năng · Nhiệm vụ'), key('P O G R M', 'Nhóm · Bạn bè · Gia tộc · Xếp hạng · Bản đồ'), key('K L', 'Thú cưng · Hộp thư'), key('Enter', 'Chat'), key('Esc', 'Đóng cửa sổ · hủy tìm đường'),
        h('div', { class: 'muted tiny' }, 'Bấm vào NPC để nói chuyện, bấm vào người chơi để mời nhóm/giao dịch/thách đấu.'))),
    h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => this.onChangeChar && this.onChangeChar() }, 'Đổi nhân vật'), h('button', { class: 'btn danger', onclick: () => this.onLogout && this.onLogout() }, 'Đăng xuất')));
  },

  // Tự động nâng cao: hồi sinh, quay lại bãi, chọn quái, đồ ăn, kỹ năng auto được dùng
  autoPlusSec(seg, num, chk) {
    const st = S.settings;
    const me = S.me;
    const sids = me ? [...new Set(me.hotbar.filter(Boolean))].filter((sid) => S.G.skills[sid] && !S.G.skills[sid].basic) : [];
    const skillChips = h('div', { class: 'auto-skills', 'data-auto-skills': '' }, ...sids.map((sid) => {
      const on = !st.autoSkip.includes(sid);
      return h('button', { class: `auto-sk${on ? ' on' : ''}`, 'data-sid': sid, 'aria-pressed': String(on), title: S.G.skills[sid].name,
        onclick: () => {
          st.autoSkip = on ? [...st.autoSkip, sid] : st.autoSkip.filter((x) => x !== sid);
          saveSettings();
          this.refresh();
        } }, skImg(sid), h('span', null, S.G.skills[sid].name));
    }));
    return h('div', { class: 'sec', 'data-sec': 'auto-plus' }, h('div', { class: 'sec-title' }, 'Tự động nâng cao'),
      seg('autoRevive', 'Tự hồi sinh', [['off', 'Tắt'], ['town', 'Về làng'], ['card', 'Thẻ'], ['luong', 'Thẻ/lượng']]),
      st.autoRevive === 'off' ? null : num('autoReviveDelay', 'Chờ trước khi hồi sinh (giây)', 1, 30),
      chk('autoBack', 'Về làng xong quay lại chỗ cũ đánh tiếp'),
      chk('autoBoss', 'Đánh cả boss'),
      chk('autoLock', 'Chỉ đánh loại quái đầu tiên'),
      chk('autoFood', 'Tự ăn đồ ăn tăng sức khi hết hiệu ứng'),
      h('div', { class: 'set-row col' }, h('span', null, 'Kỹ năng auto được dùng'), sids.length ? skillChips : h('div', { class: 'muted tiny' }, 'Chưa gắn kỹ năng nào lên thanh kỹ năng.')),
      h('div', { class: 'muted tiny' }, 'Tự hồi sinh chỉ chạy khi đang bật tự động đánh. "Thẻ": hết Thẻ Hồi Sinh thì về làng. "Thẻ/lượng": hết thẻ thì trả 1 lượng. Không áp dụng ở lôi đài; ở phó bản thì không tự quay lại.'));
  },
};
