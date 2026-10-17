'use strict';

// type:
//   single - đánh 1 mục tiêu (hits lần)
//   aoe    - vùng tròn quanh bản thân (center:self) hoặc quanh mục tiêu (center:target)
//   line   - mọi kẻ địch trên đường thẳng phía trước
//   dash   - lướt về phía trước và gây sát thương trên đường đi
//   buff   - tăng chỉ số cho bản thân (party:true => cả nhóm ở gần)
//   heal   - hồi máu cho bản thân và đồng đội ở gần
// mp / mul / buff.v : [giá trị cơ bản, cộng thêm mỗi cấp kỹ năng]
// fx: hiệu ứng hiển thị phía client
const SKILLS = {
  // ===== Kiếm (Hỏa, cận chiến)
  k0: { cls: 'kiem', name: 'Chém Thường', req: 1, basic: true, type: 'single', range: 42, cd: 450, mp: [0, 0], mul: [1, 0], fx: { k: 'slash', c: '#ffffff' } },
  k1: { cls: 'kiem', name: 'Hỏa Kiếm Trảm', req: 1, type: 'single', range: 56, cd: 2500, mp: [8, 2], mul: [1.8, 0.15], fx: { k: 'slash', c: '#ff7043', big: true }, desc: 'Chém mạnh một mục tiêu bằng kiếm lửa.' },
  k2: { cls: 'kiem', name: 'Liệt Hỏa Hoàn', req: 5, type: 'aoe', center: 'self', radius: 85, cd: 6000, mp: [15, 3], mul: [1.4, 0.12], fx: { k: 'burst', c: '#ff5722' }, desc: 'Xoay kiếm tạo vòng lửa, gây sát thương xung quanh.' },
  k3: { cls: 'kiem', name: 'Kiếm Khí Phi Tuyệt', req: 10, type: 'line', range: 170, cd: 4500, mp: [14, 3], mul: [2.0, 0.18], fx: { k: 'wave', c: '#ffab40' }, desc: 'Phóng kiếm khí xuyên qua mọi kẻ địch phía trước.' },
  k4: { cls: 'kiem', name: 'Hỏa Thần Hộ Thể', req: 20, type: 'buff', cd: 60000, mp: [30, 4], buff: { stat: 'atkPct', v: [10, 2], dur: 30000 }, fx: { k: 'aura', c: '#ff7043' }, desc: 'Tăng % tấn công trong 30 giây.' },
  k5: { cls: 'kiem', name: 'Thiên Hỏa Phần Thiên', req: 30, type: 'aoe', center: 'target', range: 150, radius: 120, cd: 15000, mp: [50, 6], mul: [3.5, 0.3], fx: { k: 'meteor', c: '#ff3d00' }, desc: 'Gọi thiên thạch lửa giáng xuống khu vực mục tiêu.' },

  // ===== Tiêu (Hỏa, đánh xa)
  t0: { cls: 'tieu', name: 'Ném Tiêu', req: 1, basic: true, type: 'single', range: 150, cd: 500, mp: [0, 0], mul: [0.95, 0], fx: { k: 'proj', p: 'shuriken', c: '#cfd8dc' } },
  t1: { cls: 'tieu', name: 'Song Tiêu', req: 1, type: 'single', hits: 2, range: 170, cd: 2500, mp: [8, 2], mul: [0.95, 0.08], fx: { k: 'proj', p: 'shuriken', c: '#ff8a65', n: 2 }, desc: 'Ném liền hai phi tiêu lửa vào mục tiêu.' },
  t2: { cls: 'tieu', name: 'Hỏa Tiêu Vũ', req: 5, type: 'aoe', center: 'target', range: 170, radius: 70, cd: 6000, mp: [15, 3], mul: [1.35, 0.12], fx: { k: 'rain', p: 'shuriken', c: '#ff7043' }, desc: 'Mưa phi tiêu lửa trút xuống khu vực mục tiêu.' },
  t3: { cls: 'tieu', name: 'Ẩn Thân Thuật', req: 10, type: 'buff', cd: 45000, mp: [20, 3], buff: { stat: 'dodge', v: [10, 1.5], dur: 20000 }, fx: { k: 'aura', c: '#b0bec5' }, desc: 'Tăng né tránh trong 20 giây.' },
  t4: { cls: 'tieu', name: 'Bạo Liệt Tiêu', req: 20, type: 'single', range: 180, cd: 8000, mp: [28, 4], mul: [3.0, 0.25], fx: { k: 'proj', p: 'fire', c: '#ff3d00', boom: true }, desc: 'Phi tiêu phát nổ gây sát thương cực lớn.' },
  t5: { cls: 'tieu', name: 'Thiên La Địa Võng', req: 30, type: 'aoe', center: 'target', range: 180, radius: 130, cd: 15000, mp: [50, 6], mul: [3.2, 0.3], fx: { k: 'rain', p: 'shuriken', c: '#ffd54f', big: true }, desc: 'Lưới phi tiêu bao phủ diện rộng.' },

  // ===== Kunai (Thủy, cận chiến)
  n0: { cls: 'kunai', name: 'Đâm Kunai', req: 1, basic: true, type: 'single', range: 40, cd: 420, mp: [0, 0], mul: [1, 0], fx: { k: 'slash', c: '#e0f7fa' } },
  n1: { cls: 'kunai', name: 'Thủy Lưu Trảm', req: 1, type: 'single', hits: 2, range: 55, cd: 2500, mp: [8, 2], mul: [0.95, 0.08], fx: { k: 'slash', c: '#4fc3f7', big: true }, desc: 'Hai nhát chém nước liên hoàn.' },
  n2: { cls: 'kunai', name: 'Thủy Long Quyển', req: 5, type: 'aoe', center: 'self', radius: 80, cd: 6000, mp: [15, 3], mul: [1.4, 0.12], fx: { k: 'burst', c: '#29b6f6' }, desc: 'Xoáy nước cuốn kẻ địch xung quanh.' },
  n3: { cls: 'kunai', name: 'Trị Liệu Thuật', req: 10, type: 'heal', radius: 150, cd: 20000, mp: [25, 3], heal: [15, 1.5], fx: { k: 'heal', c: '#69f0ae' }, desc: 'Hồi % sinh lực cho bản thân và đồng đội ở gần.' },
  n4: { cls: 'kunai', name: 'Băng Phong Thứ', req: 20, type: 'single', range: 130, cd: 7000, mp: [26, 4], mul: [2.6, 0.22], slow: 3000, fx: { k: 'proj', p: 'ice', c: '#b3e5fc' }, desc: 'Phóng kunai băng, làm chậm mục tiêu 3 giây.' },
  n5: { cls: 'kunai', name: 'Đại Hải Khiếu', req: 30, type: 'aoe', center: 'self', radius: 140, cd: 15000, mp: [50, 6], mul: [3.3, 0.3], fx: { k: 'burst', c: '#0288d1', big: true }, desc: 'Sóng thần quét sạch kẻ địch xung quanh.' },

  // ===== Cung (Thủy, đánh xa)
  c0: { cls: 'cung', name: 'Bắn Tên', req: 1, basic: true, type: 'single', range: 175, cd: 550, mp: [0, 0], mul: [1, 0], fx: { k: 'proj', p: 'arrow', c: '#efebe9' } },
  c1: { cls: 'cung', name: 'Thủy Tiễn', req: 1, type: 'single', range: 195, cd: 2500, mp: [8, 2], mul: [1.8, 0.15], fx: { k: 'proj', p: 'arrow', c: '#4fc3f7', big: true }, desc: 'Mũi tên nước gây sát thương lớn.' },
  c2: { cls: 'cung', name: 'Mưa Tên', req: 5, type: 'aoe', center: 'target', range: 190, radius: 75, cd: 6000, mp: [15, 3], mul: [1.35, 0.12], fx: { k: 'rain', p: 'arrow', c: '#81d4fa' }, desc: 'Mưa tên trút xuống khu vực mục tiêu.' },
  c3: { cls: 'cung', name: 'Ưng Nhãn', req: 10, type: 'buff', cd: 60000, mp: [20, 3], buff: { stat: 'crit', v: [8, 1], dur: 30000 }, fx: { k: 'aura', c: '#4fc3f7' }, desc: 'Tăng % chí mạng trong 30 giây.' },
  c4: { cls: 'cung', name: 'Xuyên Vân Tiễn', req: 20, type: 'line', range: 230, cd: 7000, mp: [26, 4], mul: [2.6, 0.22], fx: { k: 'wave', p: 'arrow', c: '#e1f5fe' }, desc: 'Mũi tên xuyên thấu mọi kẻ địch phía trước.' },
  c5: { cls: 'cung', name: 'Thủy Long Tiễn', req: 30, type: 'aoe', center: 'target', range: 200, radius: 120, cd: 15000, mp: [50, 6], mul: [3.3, 0.3], fx: { k: 'meteor', c: '#0288d1' }, desc: 'Mũi tên hóa rồng nước giáng xuống diện rộng.' },

  // ===== Đao (Phong, cận chiến)
  d0: { cls: 'dao', name: 'Chém Đao', req: 1, basic: true, type: 'single', range: 44, cd: 480, mp: [0, 0], mul: [1.02, 0], fx: { k: 'slash', c: '#f1f8e9' } },
  d1: { cls: 'dao', name: 'Phong Đao Trảm', req: 1, type: 'single', range: 58, cd: 2500, mp: [8, 2], mul: [1.8, 0.15], fx: { k: 'slash', c: '#9ccc65', big: true }, desc: 'Nhát chém gió sắc bén.' },
  d2: { cls: 'dao', name: 'Toàn Phong Trảm', req: 5, type: 'aoe', center: 'self', radius: 85, cd: 6000, mp: [15, 3], mul: [1.4, 0.12], fx: { k: 'burst', c: '#8bc34a' }, desc: 'Xoay đao như lốc, chém mọi kẻ xung quanh.' },
  d3: { cls: 'dao', name: 'Thiết Bích', req: 10, type: 'buff', party: true, cd: 50000, mp: [20, 3], buff: { stat: 'defPct', v: [20, 3], dur: 30000 }, fx: { k: 'aura', c: '#c5e1a5' }, desc: 'Tăng % phòng thủ cho bản thân và nhóm trong 30 giây.' },
  d4: { cls: 'dao', name: 'Phong Ảnh Đột Kích', req: 20, type: 'dash', range: 130, cd: 7000, mp: [26, 4], mul: [2.5, 0.22], fx: { k: 'dash', c: '#aed581' }, desc: 'Lướt về phía trước, chém mọi kẻ địch trên đường.' },
  d5: { cls: 'dao', name: 'Bão Táp Đao', req: 30, type: 'aoe', center: 'self', radius: 150, cd: 15000, mp: [50, 6], mul: [3.3, 0.3], fx: { k: 'whirl', c: '#7cb342', big: true }, desc: 'Gọi bão gió cuồng nộ quanh thân.' },

  // ===== Quạt (Phong, đánh xa)
  q0: { cls: 'quat', name: 'Phong Nhận', req: 1, basic: true, type: 'single', range: 150, cd: 520, mp: [0, 0], mul: [0.97, 0], fx: { k: 'proj', p: 'wind', c: '#dcedc8' } },
  q1: { cls: 'quat', name: 'Phong Nhận Liên Hoàn', req: 1, type: 'single', hits: 3, range: 165, cd: 2800, mp: [9, 2], mul: [0.65, 0.055], fx: { k: 'proj', p: 'wind', c: '#9ccc65', n: 3 }, desc: 'Ba lưỡi gió liên tiếp.' },
  q2: { cls: 'quat', name: 'Lốc Xoáy', req: 5, type: 'aoe', center: 'target', range: 170, radius: 70, cd: 6000, mp: [15, 3], mul: [1.35, 0.12], fx: { k: 'whirl', c: '#aed581' }, desc: 'Tạo lốc xoáy tại vị trí mục tiêu.' },
  q3: { cls: 'quat', name: 'Hồi Xuân Phong', req: 10, type: 'heal', radius: 170, cd: 18000, mp: [25, 3], heal: [18, 1.8], fx: { k: 'heal', c: '#b9f6ca' }, desc: 'Gió xuân hồi % sinh lực cho cả nhóm ở gần.' },
  q4: { cls: 'quat', name: 'Tốc Phong Thuật', req: 20, type: 'buff', party: true, cd: 50000, mp: [24, 3], buff: { stat: 'spd', v: [15, 1.5], dur: 30000 }, fx: { k: 'aura', c: '#ccff90' }, desc: 'Tăng % tốc độ di chuyển cho nhóm trong 30 giây.' },
  q5: { cls: 'quat', name: 'Cuồng Phong Bạo', req: 30, type: 'aoe', center: 'target', range: 180, radius: 140, cd: 15000, mp: [50, 6], mul: [3.2, 0.3], fx: { k: 'whirl', c: '#558b2f', big: true }, desc: 'Cuồng phong hủy diệt diện rộng.' },
};

const SKILL_MAX_LV = 10;

function classSkills(cls) {
  return Object.keys(SKILLS).filter((id) => SKILLS[id].cls === cls);
}

function basicSkill(cls) {
  return classSkills(cls).find((id) => SKILLS[id].basic);
}

function skillVal(arr, lv) {
  if (!arr) return 0;
  return arr[0] + arr[1] * Math.max(0, lv - 1);
}

module.exports = { SKILLS, SKILL_MAX_LV, classSkills, basicSkill, skillVal };
