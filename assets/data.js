/* 作品清单 —— 加一条作品就在这里加一段；或重新跑 build_assets.py 自动生成 */
const GROUPS = [
  { key: "man", name: "漫剪", en: "AMV / MANJIAN" },
  { key: "game", name: "瓦剪 / 游戏", en: "GAME EDIT" },
  { key: "story", name: "剧情短片", en: "STORY" },
  { key: "proj", name: "项目宣传", en: "PROJECT" },
  { key: "event", name: "活动演出", en: "EVENT" },
  { key: "travel", name: "旅拍 Vlog", en: "TRAVEL" },
  { key: "crea", name: "创意混剪", en: "CREATIVE" },
];

const WORKS = [
  {
    id: "man01", title: "漫剪 02", group: "man",
    feat: true, portrait: false, durLabel: "00:24",
    cover: "assets/covers/man01.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/man01.mp4"
  },
  {
    id: "man02", title: "漫剪 01", group: "man",
    feat: true, portrait: false, durLabel: "00:25",
    cover: "assets/covers/man02.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/man02.mp4"
  },
  {
    id: "man03", title: "相遇是解药", group: "man",
    feat: false, portrait: false, durLabel: "01:11",
    cover: "assets/covers/man03.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/man03.mp4"
  },
  {
    id: "man04", title: "漫剪 04", group: "man",
    feat: false, portrait: false, durLabel: "00:27",
    cover: "assets/covers/man04.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/man04.mp4"
  },
  {
    id: "game01", title: "瓦剪 01", group: "game",
    feat: false, portrait: false, durLabel: "00:19",
    cover: "assets/covers/game01.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/game01.mp4"
  },
  {
    id: "game02", title: "瓦剪 02", group: "game",
    feat: false, portrait: false, durLabel: "00:43",
    cover: "assets/covers/game02.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/game02.mp4"
  },
  {
    id: "game03", title: "瓦剪 03", group: "game",
    feat: false, portrait: false, durLabel: "00:34",
    cover: "assets/covers/game03.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/game03.mp4"
  },
  {
    id: "game04", title: "瓦剪 04", group: "game",
    feat: true, portrait: false, durLabel: "01:36",
    cover: "assets/covers/game04.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/game04.mp4"
  },
  {
    id: "story01", title: "长鼻子的选择", group: "story",
    feat: true, portrait: false, durLabel: "03:00",
    cover: "assets/covers/story01.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/story01.mp4"
  },
  {
    id: "story02", title: "反诈宣传片", group: "story",
    feat: false, portrait: false, durLabel: "03:00",
    cover: "assets/covers/story02.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/story02.mp4"
  },
  {
    id: "proj01", title: "推普周采访", group: "proj",
    feat: true, portrait: false, durLabel: "03:42",
    cover: "assets/covers/proj01.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/proj01.mp4"
  },
  {
    id: "proj02", title: "三下乡社会实践", group: "proj",
    feat: true, portrait: false, durLabel: "05:18",
    cover: "assets/covers/proj02.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/proj02.mp4"
  },
  {
    id: "proj03", title: "国庆思政课", group: "proj",
    feat: false, portrait: true, durLabel: "02:34",
    cover: "assets/covers/proj03.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/proj03.mp4"
  },
  {
    id: "proj04", title: "滴守护", group: "proj",
    feat: false, portrait: false, durLabel: "00:58",
    cover: "assets/covers/proj04.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/proj04.mp4"
  },
  {
    id: "proj05", title: "防水项目 01", group: "proj",
    feat: false, portrait: true, durLabel: "00:41",
    cover: "assets/covers/proj05.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/proj05.mp4"
  },
  {
    id: "proj06", title: "防水项目 02", group: "proj",
    feat: false, portrait: true, durLabel: "00:22",
    cover: "assets/covers/proj06.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/proj06.mp4"
  },
  {
    id: "event01", title: "国际歌", group: "event",
    feat: false, portrait: false, durLabel: "04:44",
    cover: "assets/covers/event01.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/event01.mp4"
  },
  {
    id: "event02", title: "迎新", group: "event",
    feat: true, portrait: false, durLabel: "00:51",
    cover: "assets/covers/event02.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/event02.mp4"
  },
  {
    id: "event03", title: "明堂", group: "event",
    feat: false, portrait: false, durLabel: "00:16",
    cover: "assets/covers/event03.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/event03.mp4"
  },
  {
    id: "travel01", title: "稻城之行", group: "travel",
    feat: true, portrait: false, durLabel: "00:20",
    cover: "assets/covers/travel01.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/travel01.mp4"
  },
  {
    id: "travel02", title: "峨眉山之行", group: "travel",
    feat: false, portrait: true, durLabel: "00:25",
    cover: "assets/covers/travel02.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/travel02.mp4"
  },
  {
    id: "travel03", title: "镝的 Vlog", group: "travel",
    feat: false, portrait: true, durLabel: "01:37",
    cover: "assets/covers/travel03.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/travel03.mp4"
  },
  {
    id: "crea01", title: "地平线", group: "crea",
    feat: false, portrait: false, durLabel: "01:31",
    cover: "assets/covers/crea01.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/crea01.mp4"
  },
  {
    id: "crea02", title: "抽象剪", group: "crea",
    feat: false, portrait: false, durLabel: "00:30",
    cover: "assets/covers/crea02.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/crea02.mp4"
  },
  {
    id: "crea03", title: "星游记", group: "crea",
    feat: false, portrait: true, durLabel: "00:09",
    cover: "assets/covers/crea03.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/crea03.mp4"
  },
  {
    id: "crea04", title: "混剪 · 思政", group: "crea",
    feat: true, portrait: false, durLabel: "03:01",
    cover: "assets/covers/crea04.jpg", video: "https://github.com/Cdzqzy3344/chendi-portfolio/releases/download/media-v2/crea04.mp4"
  },
];
