'use strict';

// Ngũ hành rút gọn: Hỏa khắc Phong, Phong khắc Thủy, Thủy khắc Hỏa.
const ELEMENTS = {
  fire: { name: 'Hỏa', color: '#ff7043', beats: 'wind' },
  water: { name: 'Thủy', color: '#42a5f5', beats: 'fire' },
  wind: { name: 'Phong', color: '#66bb6a', beats: 'water' },
};

const CLASSES = {
  kiem: {
    name: 'Kiếm', element: 'fire', weapon: 'sword', weaponName: 'Kiếm', melee: true, village: 'v_fire',
    desc: 'Cận chiến hệ Hỏa. Sát thương lớn, chém lan nhiều mục tiêu.',
  },
  tieu: {
    name: 'Tiêu', element: 'fire', weapon: 'shuriken', weaponName: 'Phi Tiêu', melee: false, village: 'v_fire',
    desc: 'Đánh xa hệ Hỏa. Phi tiêu tốc độ cao, ẩn thân né đòn.',
  },
  kunai: {
    name: 'Kunai', element: 'water', weapon: 'kunai', weaponName: 'Kunai', melee: true, village: 'v_water',
    desc: 'Cận chiến hệ Thủy. Tự trị thương, làm chậm kẻ địch.',
  },
  cung: {
    name: 'Cung', element: 'water', weapon: 'bow', weaponName: 'Cung', melee: false, village: 'v_water',
    desc: 'Đánh xa hệ Thủy. Tầm bắn xa nhất, chí mạng cao.',
  },
  dao: {
    name: 'Đao', element: 'wind', weapon: 'blade', weaponName: 'Đao', melee: true, village: 'v_wind',
    desc: 'Cận chiến hệ Phong. Phòng thủ chắc chắn, lướt chém xuyên địch.',
  },
  quat: {
    name: 'Quạt', element: 'wind', weapon: 'fan', weaponName: 'Quạt', melee: false, village: 'v_wind',
    desc: 'Đánh xa hệ Phong. Hồi máu đồng đội, lốc xoáy diện rộng.',
  },
};

const BASE_STATS = {
  melee: { hp: 120, mp: 50, atk: 12, def: 4, hpLv: 18, mpLv: 6, atkLv: 2.5, defLv: 1.0, crit: 5, dodge: 3 },
  ranged: { hp: 100, mp: 60, atk: 13, def: 3, hpLv: 15, mpLv: 7, atkLv: 2.6, defLv: 0.8, crit: 6, dodge: 4 },
};

const STAT_NAMES = {
  str: 'Sức mạnh',
  agi: 'Thân pháp',
  int: 'Chakra',
  vit: 'Thể lực',
};

module.exports = { ELEMENTS, CLASSES, BASE_STATS, STAT_NAMES };
