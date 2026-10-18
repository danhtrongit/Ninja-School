'use strict';

// Âm thanh: file nằm ở src/client/audio/{music,sfx}/<id>.ogg (+ <id>.m4a cho trình duyệt không phát được Opus).
// File được tạo ngoài repo (nhạc: ACE-Step 1.5, MIT; tiếng: Stable Audio 3 Small SFX, Stability AI Community License).
// Thiếu file nào thì máy khách bỏ qua nhạc đó / dùng tiếng tổng hợp WebAudio như cũ.

// Nhạc nền theo theme bản đồ (theme chưa có dòng thì dùng MUSIC_DEFAULT)
const MUSIC_THEME = {
  village_fire: 'village_fire', village_water: 'village_water', village_wind: 'village_wind',
  grass_fire: 'field_grass', grass_wind: 'field_grass', lake: 'field_beach', bamboo: 'field_bamboo', beach: 'field_beach',
  cave: 'field_cave', desert: 'field_desert', mist: 'field_mist', snow: 'field_snow', ice: 'field_snow',
  dark_forest: 'field_dark', lava: 'field_lava', hell: 'field_hell', heaven: 'field_heaven', dragon_palace: 'field_sea',
  abyss: 'field_abyss', sakura: 'field_sakura', ruins: 'field_ruins', crystal: 'field_crystal', arena: 'arena',
};
const MUSIC_DEFAULT = 'field_grass';
// Nhạc theo tình huống, ưu tiên hơn nhạc bản đồ: màn hình mở đầu, đánh boss, Tà Thú, lôi đài, phó bản, lễ hội ở làng
const MUSIC_SCENE = { title: 'title', boss: 'boss', tathu: 'tathu', arena: 'arena', dungeon: 'dungeon', festival: 'festival' };

// Tiếng kỹ năng theo id; kỹ năng chưa có dòng riêng dùng tiếng theo kiểu hiệu ứng fx.k
const SKILL_SFX = {
  k0: 'slash_basic', k1: 'slash_fire', k2: 'fire_burst', k3: 'sword_wave', k4: 'buff', k5: 'meteor', k6: 'meteor',
  t0: 'shuriken', t1: 'shuriken', t2: 'shuriken_rain', t3: 'buff', t4: 'explosive_shuriken', t5: 'shuriken_rain', t6: 'shuriken_rain',
  n0: 'kunai_stab', n1: 'water_slash', n2: 'water_vortex', n3: 'heal', n4: 'ice_shard', n5: 'tsunami', n6: 'ice_shard',
  c0: 'arrow', c1: 'arrow', c2: 'arrow_rain', c3: 'buff', c4: 'pierce_arrow', c5: 'tsunami', c6: 'pierce_arrow',
  d0: 'slash_basic', d1: 'blade_wind', d2: 'whirlwind', d3: 'buff', d4: 'dash', d5: 'whirlwind', d6: 'dash',
  q0: 'wind_blade', q1: 'wind_blade', q2: 'tornado', q3: 'heal', q4: 'buff', q5: 'tornado', q6: 'tornado',
};
const FX_SFX = {
  slash: 'slash_basic', proj: 'shuriken', rain: 'arrow_rain', burst: 'fire_burst', wave: 'sword_wave', meteor: 'meteor',
  whirl: 'whirlwind', aura: 'buff', heal: 'heal', dash: 'dash',
};

// Tên tiếng máy khách gọi (sfx('...')) → file; tên không có ở đây mà trùng id file thì dùng thẳng file đó
const EVENT_SFX = {
  hit: 'hit', crit: 'crit', hurt: 'hurt', coin: 'coin', pickup: 'pickup', level: 'levelup', portal: 'portal',
  click: 'ui_click', open: 'ui_open', boss: 'boss_warn', heal: 'heal', die: 'defeat', swing: 'slash_basic',
};
// Chiêu boss (k của BOSS_SKILLS) → tiếng
const BOSS_SFX = { quake: 'boss_quake', roar: 'boss_roar', summon: 'boss_summon', beam: 'boss_beam', nova: 'boss_nova' };

module.exports = { MUSIC_THEME, MUSIC_DEFAULT, MUSIC_SCENE, SKILL_SFX, FX_SFX, EVENT_SFX, BOSS_SFX };
