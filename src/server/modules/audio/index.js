'use strict';

// Âm thanh: gửi bảng nhạc/tiếng (src/shared/data/audio.js) và danh sách file đang có trong src/client/audio cho máy khách
const fs = require('fs');
const path = require('path');
const AUDIO = require('../../../shared/data/audio');

const DIR = path.join(__dirname, '../../../client/audio');

// id của các file <id>.<ext> trong audio/<kind> (.ogg là bản chính; .m4a là bản phụ cho trình duyệt không phát được Opus)
function listIds(kind, ext = 'ogg') {
  try {
    return fs.readdirSync(path.join(DIR, kind)).filter((f) => f.endsWith(`.${ext}`) && /^[a-z0-9_]+$/.test(f.slice(0, -ext.length - 1)))
      .map((f) => f.slice(0, -ext.length - 1)).sort();
  } catch (e) {
    return [];
  }
}

module.exports = {
  name: 'audio',
  hooks: {
    clientData(out) {
      out.audio = { ...AUDIO, have: { music: listIds('music'), sfx: listIds('sfx') }, m4a: { music: listIds('music', 'm4a'), sfx: listIds('sfx', 'm4a') } };
    },
  },
  listIds,
};
