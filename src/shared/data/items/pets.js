'use strict';

const { PETS, PET_FOOD } = require('../pets');
const { ITEMS, add } = require('./base');

function build() {
  // Thú cưng: đi theo chủ, tăng kinh nghiệm và chỉ số theo cấp thú (pets.js). look = mã hình trong petart.js
  for (const [id, name, lv, stats, luong, look, skills] of PETS) {
    ITEMS[id] = {
      name, type: 'equip', slot: 'pet', tier: 0, lv, stats, look, petSkills: skills, noUpgrade: true,
      priceLuong: luong || undefined, price: luong ? 0 : 50000,
      icon: { k: 'pet', c: '#ffb74d', s: look }, desc: luong ? 'Thú cưng đi theo chủ nhân, lên cấp khi chủ diệt quái hoặc được cho ăn.' : 'Chỉ rơi từ Long Vương. Thú cưng mạnh nhất.',
    };
  }
  // Thức ăn thú: dùng khi đang mang thú theo, tăng EXP và độ thân mật của thú
  for (const [id, name, exp, love, xu, luong, s, c] of PET_FOOD) {
    add(id, {
      name, type: 'petfood', lv: 1, effect: { petExp: exp, love }, price: xu, priceLuong: luong || undefined, stack: 999,
      icon: { k: 'petfood', c, s }, desc: `Cho thú cưng đang mang theo ăn: +${exp.toLocaleString('vi-VN')} EXP thú, +${love} thân mật.`,
    });
  }
}

// Hàng bán ở tiệm thuốc
const PET_SHOP = PETS.filter((p) => p[4] > 0).map((p) => p[0]);
const PET_FOOD_XU = PET_FOOD.filter((f) => f[4] > 0).map((f) => f[0]);
const PET_FOOD_LUONG = PET_FOOD.filter((f) => f[5] > 0).map((f) => f[0]);

module.exports = { build, PET_SHOP, PET_FOOD_XU, PET_FOOD_LUONG };
