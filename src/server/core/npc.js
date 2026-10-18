'use strict';

const { NPC_TYPES } = require('../../shared/data/maps');

const NPC_RANGE = 130;

// NPC id trên bản đồ hiện tại, đứng đủ gần (type: chỉ nhận đúng loại NPC). Không hợp lệ thì null
function nearNpc(p, id, type) {
  if (!p.map || p.dead) return null;
  // id rác (object, mảng...) bị bỏ qua: String() trên object không prototype sẽ ném lỗi
  if (typeof id !== 'string' && typeof id !== 'number') return null;
  const n = p.map.findNpc(String(id));
  if (!n || (type && n.type !== type)) return null;
  if (Math.abs(n.x - p.x) > NPC_RANGE) return null;
  return n;
}

function dialog(p, n, text, opts) {
  p.send('dialog', { npc: n.id, name: n.name, title: NPC_TYPES[n.type].title, text, opts: opts || [] });
}

module.exports = { NPC_RANGE, nearNpc, dialog };
