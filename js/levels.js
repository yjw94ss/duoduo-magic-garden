/* ===========================================================
 * levels.js —— 地图 / 关卡注册表
 *
 * 设计说明：
 *  - 当前版本只实现「彩虹花园」rainbow_garden
 *  - 其余 6 张地图在 registry 里已注册好完整的配置字段，
 *    后续只需在 world.js 里加对应的 build 函数即可启用，
 *    不需要改动任务系统 / 存档 / UI 任何代码。
 * =========================================================== */
(function (global) {
  'use strict';

  /* ---------- 通用：教育主题定义 ---------- */
  var EDU = {
    // 颜色认知
    colors: [
      { key: 'red',    name: '红色', hex: 0xff5f7e, css: '#ff5f7e' },
      { key: 'orange', name: '橙色', hex: 0xffa14f, css: '#ffa14f' },
      { key: 'yellow', name: '黄色', hex: 0xffd93d, css: '#ffd93d' },
      { key: 'green',  name: '绿色', hex: 0x63d68a, css: '#63d68a' },
      { key: 'blue',   name: '蓝色', hex: 0x5bb8ff, css: '#5bb8ff' },
      { key: 'purple', name: '紫色', hex: 0xb78cff, css: '#b78cff' }
    ],
    // 数字 1-10（启蒙用，配大号按钮）
    numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    // 形状认知
    shapes: [
      { key: 'circle', name: '圆形', css: '⚽' },
      { key: 'square', name: '方形', css: '🟦' },
      { key: 'triangle', name: '三角形', css: '🔺' },
      { key: 'star', name: '星形', css: '⭐' },
      { key: 'heart', name: '心形', css: '💗' }
    ],
    // 水果认知
    fruits: [
      { key: 'apple',  name: '苹果', css: '🍎' },
      { key: 'pear',   name: '梨',   css: '🍐' },
      { key: 'peach',  name: '桃子', css: '🍑' },
      { key: 'grape',  name: '葡萄', css: '🍇' },
      { key: 'lemon',  name: '柠檬', css: '🍋' }
    ],
    // 动物认知
    animals: [
      { key: 'rabbit',   name: '小兔子', css: '🐰' },
      { key: 'cat',      name: '小猫',   css: '🐱' },
      { key: 'deer',     name: '小鹿',   css: '🦌' },
      { key: 'bear',     name: '小熊',   css: '🐻' },
      { key: 'butterfly',name: '蝴蝶',   css: '🦋' },
      { key: 'unicorn',  name: '独角兽', css: '🦄' },
      { key: 'duck',     name: '鸭子',   css: '🦆' },
      { key: 'bird',     name: '小鸟',   css: '🐦' }
    ],
    // 方向认知
    directions: [
      { key: 'up',    name: '上面', css: '⬆️' },
      { key: 'down',  name: '下面', css: '⬇️' },
      { key: 'left',  name: '左边', css: '⬅️' },
      { key: 'right', name: '右边', css: '➡️' }
    ]
  };

  /* ---------- 地图注册表 ---------- */
  var REGISTRY = {

    /* ========== 已实现 ========== */
    rainbow_garden: {
      id: 'rainbow_garden',
      name: '彩虹花园',
      icon: '🌈',
      theme: 'grass',
      implemented: true,
      order: 1,
      // 场地参数：孩子站在中心基本能看到所有目标
      // radius 是"孩子能走到的最远距离"，边界树墙画在这条线上。
      // 中心活动区（彩虹门/房子/池塘/花田/NPC）仍然紧凑，
      // 中心半径 32 以内一眼看全；32 以外是自由探索的花园深处。
      radius: 82,
      coreRadius: 32,     // 核心活动区半径
      midRadius: 56,      // 中环过渡区半径
      spawn: { x: 0, z: 14 },
      // 本地图承载的教育目标
      eduFocus: ['colors', 'numbers', 'counting', 'animals', 'observation'],
      // 5 个小游戏的任务顺序
      taskOrder: ['carrot', 'redFlower', 'countDuck', 'catHome', 'rainbowGem'],
      // 环境色（天空 / 雾 / 草地）
      sky: 0xbfe9ff,
      fog: 0xdff2ff,
      grass: 0x8ede9f,
      desc: '开满鲜花的柔软草地，有小池塘、木桥、彩虹门和小房子。'
    },

    /* ========== 已预留，未实现 ========== */
    candy_forest: {
      id: 'candy_forest',
      name: '糖果森林',
      icon: '🍭',
      theme: 'candy',
      implemented: false,
      order: 2,
      radius: 50,
      spawn: { x: 0, z: 16 },
      eduFocus: ['shapes', 'colors', 'classification'],
      taskOrder: [],
      sky: 0xffe0f2,
      fog: 0xffeaf6,
      grass: 0xffb8dd,
      desc: '棒棒糖当树，棉花糖当云，甜甜的分类小任务。'
    },

    ocean_world: {
      id: 'ocean_world',
      name: '海底世界',
      icon: '🐠',
      theme: 'ocean',
      implemented: false,
      order: 3,
      radius: 52,
      spawn: { x: 0, z: 18 },
      eduFocus: ['animals', 'fruits', 'sizes'],
      taskOrder: [],
      sky: 0x7fd4f0,
      fog: 0xaee6f7,
      grass: 0xffeec2,       // 海底沙地
      desc: '贝壳小房子，海星做路标，认识海洋小动物。'
    },

    dino_park: {
      id: 'dino_park',
      name: '恐龙乐园',
      icon: '🦕',
      theme: 'dino',
      implemented: false,
      order: 4,
      radius: 54,
      spawn: { x: 0, z: 20 },
      eduFocus: ['sizes', 'numbers', 'observation'],
      taskOrder: [],
      sky: 0xcfe9b8,
      fog: 0xe6f5d8,
      grass: 0x9fd97f,
      desc: '温和的草食恐龙，比一比谁大谁小、数一数蛋。'
    },

    star_castle: {
      id: 'star_castle',
      name: '星空城堡',
      icon: '🏰',
      theme: 'star',
      implemented: false,
      order: 5,
      radius: 48,
      spawn: { x: 0, z: 18 },
      eduFocus: ['numbers', 'shapes', 'directions'],
      taskOrder: [],
      sky: 0x3c3a72,        // 注意：城堡是"夜空"主题，但保持明亮柔和，不做恐怖处理
      fog: 0x5b5490,
      grass: 0x8f86d6,
      desc: '会发光的屋顶和温暖的星星灯，认数字、认方向。'
    },

    animal_farm: {
      id: 'animal_farm',
      name: '动物农场',
      icon: '🐄',
      theme: 'farm',
      implemented: false,
      order: 6,
      radius: 52,
      spawn: { x: 0, z: 18 },
      eduFocus: ['animals', 'fruits', 'counting'],
      taskOrder: [],
      sky: 0xffeccc,
      fog: 0xfff2d6,
      grass: 0xa8e07a,
      desc: '认识农场小动物，学习数一数、认水果。'
    },

    ice_world: {
      id: 'ice_world',
      name: '冰雪世界',
      icon: '❄️',
      theme: 'ice',
      implemented: false,
      order: 7,
      radius: 50,
      spawn: { x: 0, z: 18 },
      eduFocus: ['colors', 'sizes', 'classification'],
      taskOrder: [],
      sky: 0xdff3ff,
      fog: 0xeefaff,
      grass: 0xeaf8ff,
      desc: '亮晶晶的冰屋，比较大小、按颜色分类。'
    }
  };

  /* ---------- 对外接口 ---------- */
  var Levels = {
    EDU: EDU,
    registry: REGISTRY,

    /**
     * 获取地图配置
     * @param {string} id 地图 id
     */
    get: function (id) {
      return REGISTRY[id] || null;
    },

    /**
     * 当前已实现的地图 id 列表
     */
    implementedList: function () {
      return Object.keys(REGISTRY).filter(function (k) {
        return REGISTRY[k].implemented;
      });
    },

    /**
     * 全部地图列表（含未实现），用于家长模式 / 后续解锁展示
     */
    allList: function () {
      return Object.keys(REGISTRY)
        .map(function (k) { return REGISTRY[k]; })
        .sort(function (a, b) { return a.order - b.order; });
    }
  };

  global.DDLevels = Levels;
})(window);
