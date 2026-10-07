/* ===========================================================
 * npc.js —— 友好的小动物 NPC + 陪伴伙伴「小星星」
 *
 * 包含：
 *  - 6 种程序化生成的小动物（兔子/猫/鹿/熊/蝴蝶/独角兽）
 *  - 每只动物都有：待机呼吸动画、看到玩家时跳+挥手、自己的小对话
 *  - 小星星 AICompanion：孩子迷茫时会飞到目标方向指引
 *  - AICompanion 预留了大模型 API 接口（当前用本地对话库）
 * =========================================================== */
(function (global) {
  'use strict';

  var THREE = global.THREE;

  /* ===========================================================
   * 小动物模型工厂
   * =========================================================== */
  function lm(color) { return new THREE.MeshLambertMaterial({ color: color }); }

  function mesh(geo, mat, x, y, z, sx, sy, sz) {
    var m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.scale.set(sx === undefined ? 1 : sx, sy === undefined ? 1 : sy, sz === undefined ? 1 : sz);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  /* ---------- 小兔子 ---------- */
  function buildRabbit() {
    var g = new THREE.Group();
    var body = new THREE.Group();
    g.add(body);
    var fur = lm(0xfff4f0), inner = lm(0xffc9d8), pink = lm(0xffb3c9);

    // 身体
    body.add(mesh(new THREE.SphereGeometry(0.52, 16, 14), fur, 0, 0.55, 0, 1, 1.1, 0.92));
    body.add(mesh(new THREE.SphereGeometry(0.34, 14, 12), fur, 0, 0.66, 0.34, 1, 0.9, 0.8)); // 脸
    // 耳朵
    [-0.2, 0.2].forEach(function (x) {
      var ear = mesh(new THREE.CapsuleGeometry(0.1, 0.5, 4, 8), fur, x, 1.36, 0);
      ear.rotation.z = x > 0 ? -0.18 : 0.18;
      body.add(ear);
      var ie = mesh(new THREE.CapsuleGeometry(0.05, 0.38, 4, 8), inner, x, 1.36, 0.04);
      ie.rotation.z = x > 0 ? -0.18 : 0.18;
      body.add(ie);
    });
    // 眼睛
    [-0.14, 0.14].forEach(function (x) {
      body.add(mesh(new THREE.SphereGeometry(0.075, 10, 8), lm(0x3a2b33), x, 0.72, 0.6));
      body.add(mesh(new THREE.SphereGeometry(0.028, 6, 6), lm(0xffffff), x + 0.03, 0.75, 0.66));
    });
    // 鼻子 + 腮红
    body.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), pink, 0, 0.58, 0.62));
    [-0.24, 0.24].forEach(function (x) {
      body.add(mesh(new THREE.SphereGeometry(0.09, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0xffb0c4, transparent: true, opacity: 0.7 }), x, 0.6, 0.55));
    });
    // 身体上的小蝴蝶结
    var bow = new THREE.Group();
    bow.position.set(0, 0.95, -0.32);
    bow.add(mesh(new THREE.SphereGeometry(0.14, 8, 6), pink, -0.14, 0, 0, 1, 0.8, 0.5));
    bow.add(mesh(new THREE.SphereGeometry(0.14, 8, 6), pink, 0.14, 0, 0, 1, 0.8, 0.5));
    body.add(bow);
    // 小手小脚
    [-0.3, 0.3].forEach(function (x) {
      body.add(mesh(new THREE.SphereGeometry(0.13, 10, 8), fur, x, 0.42, 0.3));
      body.add(mesh(new THREE.SphereGeometry(0.15, 10, 8), fur, x, 0.12, 0.16, 1, 0.7, 1.2));
    });
    // 尾巴
    body.add(mesh(new THREE.SphereGeometry(0.16, 10, 8), lm(0xffffff), 0, 0.5, -0.5));

    return { root: g, body: body, head: null, kind: 'rabbit' };
  }

  /* ---------- 小猫 ---------- */
  function buildCat() {
    var g = new THREE.Group();
    var body = new THREE.Group();
    g.add(body);
    var fur = lm(0xffc98a), light = lm(0xfff0d8), pink = lm(0xffb3c9);

    body.add(mesh(new THREE.SphereGeometry(0.5, 16, 14), fur, 0, 0.5, 0, 1, 1.05, 0.9));
    body.add(mesh(new THREE.SphereGeometry(0.36, 16, 14), fur, 0, 0.78, 0.24, 1, 0.95, 0.95)); // 头
    // 猫耳（三角）
    [-0.22, 0.22].forEach(function (x) {
      var e = mesh(new THREE.ConeGeometry(0.16, 0.3, 4), fur, x, 1.12, 0.2);
      e.rotation.y = Math.PI / 4;
      body.add(e);
      var i = mesh(new THREE.ConeGeometry(0.09, 0.18, 4), pink, x, 1.11, 0.24);
      i.rotation.y = Math.PI / 4;
      body.add(i);
    });
    // 眼睛（绿色大眼）
    [-0.15, 0.15].forEach(function (x) {
      body.add(mesh(new THREE.SphereGeometry(0.085, 10, 8), lm(0x5fbf7a), x, 0.82, 0.52));
      body.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), lm(0x2b2b2b), x, 0.82, 0.57));
      body.add(mesh(new THREE.SphereGeometry(0.032, 6, 6), lm(0xffffff), x + 0.03, 0.86, 0.6));
    });
    // 鼻子 + 嘴
    body.add(mesh(new THREE.ConeGeometry(0.05, 0.07, 6), pink, 0, 0.7, 0.56));
    [-0.1, 0.1].forEach(function (x) {
      var arm = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4), light, x, 0.68, 0.5);
      arm.rotation.z = x > 0 ? -0.3 : 0.3;
      arm.rotation.y = Math.PI / 2;
      body.add(arm);
    });
    // 尾巴（翘起来）
    var tail = new THREE.Group();
    tail.position.set(0, 0.55, -0.46);
    var seg = mesh(new THREE.CapsuleGeometry(0.07, 0.5, 4, 8), fur, 0, 0.2, -0.1);
    seg.rotation.x = -0.5;
    tail.add(seg);
    body.add(tail);
    // 小花纹
    for (var i = 0; i < 3; i++) {
      body.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), lm(0xffab6b), -0.14 + i * 0.14, 0.95 - i * 0.14, -0.1, 1, 0.5, 0.4));
    }
    // 四只脚
    [-0.26, 0.26].forEach(function (x) {
      [-0.22, 0.24].forEach(function (z) {
        body.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.26, 8), light, x, 0.13, z));
      });
    });

    return { root: g, body: body, head: null, tail: tail, kind: 'cat' };
  }

  /* ---------- 小鹿 ---------- */
  function buildDeer() {
    var g = new THREE.Group();
    var body = new THREE.Group();
    g.add(body);
    var fur = lm(0xe8b98a), light = lm(0xfff0dc), white = lm(0xfffdf6);

    body.add(mesh(new THREE.SphereGeometry(0.52, 16, 14), fur, 0, 0.82, 0, 0.95, 1.1, 1.25));
    // 脖子
    var neck = mesh(new THREE.CapsuleGeometry(0.18, 0.4, 4, 10), fur, 0, 1.32, 0.42);
    neck.rotation.x = -0.5;
    body.add(neck);
    // 头
    var head = mesh(new THREE.SphereGeometry(0.32, 14, 12), fur, 0, 1.62, 0.66, 0.9, 0.95, 1.15);
    body.add(head);
    // 耳朵
    [-0.28, 0.28].forEach(function (x) {
      var e = mesh(new THREE.SphereGeometry(0.12, 8, 6), fur, x, 1.78, 0.6, 1.4, 0.7, 0.6);
      e.rotation.z = x > 0 ? -0.5 : 0.5;
      body.add(e);
    });
    // 鹿角
    [[-0.16, 0], [0.16, 0]].forEach(function (p) {
      var base = new THREE.Group();
      base.position.set(p[0], 1.88, 0.6);
      var a1 = mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.5, 6), lm(0xb98d5e), 0, 0.24, 0);
      a1.rotation.z = p[0] > 0 ? -0.35 : 0.35;
      base.add(a1);
      var a2 = mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.32, 6), lm(0xb98d5e), p[0] > 0 ? -0.16 : 0.16, 0.44, 0);
      a2.rotation.z = p[0] > 0 ? -0.9 : 0.9;
      base.add(a2);
      var a3 = mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.26, 6), lm(0xb98d5e), p[0] > 0 ? -0.1 : 0.1, 0.4, 0.1);
      a3.rotation.x = -0.5;
      base.add(a3);
      body.add(base);
    });
    // 眼睛 + 鼻子
    [-0.13, 0.13].forEach(function (x) {
      body.add(mesh(new THREE.SphereGeometry(0.07, 10, 8), lm(0x3a2b33), x, 1.66, 0.92));
      body.add(mesh(new THREE.SphereGeometry(0.026, 6, 6), lm(0xffffff), x + 0.02, 1.69, 0.96));
    });
    body.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), lm(0x6b4a4a), 0, 1.5, 0.98));
    // 脖子上的小铃铛
    body.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), lm(0xffd75e), 0, 1.32, 0.3));
    // 四条腿
    [-0.28, 0.28].forEach(function (x) {
      [-0.32, 0.34].forEach(function (z) {
        body.add(mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.62, 8), fur, x, 0.31, z));
        body.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), lm(0x8a6b4a), x, 0.04, z + 0.03, 1, 0.6, 1.2));
      });
    });
    // 屁股上的白点（鹿的标志）
    for (var i = 0; i < 5; i++) {
      body.add(mesh(new THREE.SphereGeometry(0.06, 6, 6), white,
        -0.16 + (i % 3) * 0.16, 0.8 + Math.floor(i / 3) * 0.14, -0.55, 1, 1, 0.4));
    }

    return { root: g, body: body, head: head, kind: 'deer' };
  }

  /* ---------- 小熊 ---------- */
  function buildBear() {
    var g = new THREE.Group();
    var body = new THREE.Group();
    g.add(body);
    var fur = lm(0xd9a86c), light = lm(0xf6d9b0);

    body.add(mesh(new THREE.SphereGeometry(0.58, 16, 14), fur, 0, 0.72, 0, 1.05, 1.05, 1));
    body.add(mesh(new THREE.SphereGeometry(0.42, 16, 14), fur, 0, 1.22, 0.16, 1, 0.95, 0.95));
    // 圆耳朵
    [-0.3, 0.3].forEach(function (x) {
      body.add(mesh(new THREE.SphereGeometry(0.16, 10, 8), fur, x, 1.58, 0.1, 1, 1, 0.5));
      body.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), light, x, 1.58, 0.2, 1, 1, 0.4));
    });
    // 脸部的浅色区域
    body.add(mesh(new THREE.SphereGeometry(0.26, 12, 10), light, 0, 1.12, 0.32, 1, 0.8, 0.6));
    // 眼睛鼻子
    [-0.16, 0.16].forEach(function (x) {
      body.add(mesh(new THREE.SphereGeometry(0.075, 10, 8), lm(0x3a2b33), x, 1.28, 0.44));
      body.add(mesh(new THREE.SphereGeometry(0.028, 6, 6), lm(0xffffff), x + 0.02, 1.31, 0.48));
    });
    body.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), lm(0x6b4a4a), 0, 1.1, 0.5, 1.2, 0.8, 0.8));
    // 微笑
    var smile = mesh(new THREE.TorusGeometry(0.1, 0.028, 6, 12, Math.PI), lm(0x6b4a4a), 0, 1.0, 0.5);
    smile.rotation.z = Math.PI;
    body.add(smile);
    // 四只脚
    [-0.34, 0.34].forEach(function (x) {
      [-0.28, 0.3].forEach(function (z) {
        body.add(mesh(new THREE.SphereGeometry(0.16, 10, 8), fur, x, 0.17, z, 1, 0.8, 1.1));
      });
    });
    // 挥手的手臂（会动）
    var armR = new THREE.Group();
    armR.position.set(0.6, 1.0, 0.1);
    var ar = mesh(new THREE.CapsuleGeometry(0.13, 0.4, 4, 8), fur, 0, -0.2, 0);
    armR.add(ar);
    armR.add(mesh(new THREE.SphereGeometry(0.15, 10, 8), light, 0, -0.46, 0));
    body.add(armR);
    var armL = new THREE.Group();
    armL.position.set(-0.6, 1.0, 0.1);
    armL.add(mesh(new THREE.CapsuleGeometry(0.13, 0.4, 4, 8), fur, 0, -0.2, 0));
    armL.add(mesh(new THREE.SphereGeometry(0.15, 10, 8), light, 0, -0.46, 0));
    body.add(armL);
    // 肚子上的一片浅色
    body.add(mesh(new THREE.SphereGeometry(0.34, 12, 10), light, 0, 0.66, 0.44, 1, 1.1, 0.4));

    return { root: g, body: body, head: null, armR: armR, armL: armL, kind: 'bear' };
  }

  /* ---------- 蝴蝶 ---------- */
  function buildButterfly() {
    var g = new THREE.Group();
    var wingMatL = new THREE.MeshLambertMaterial({
      color: 0xffb3e0, transparent: true, opacity: 0.9, side: THREE.DoubleSide
    });
    var wingMatR = new THREE.MeshLambertMaterial({
      color: 0xa8d8ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide
    });
    var bodyM = lm(0x8a6fb0);

    var bw = new THREE.Group();
    var w1 = mesh(new THREE.CircleGeometry(0.3, 14), wingMatL, -0.28, 0.06, 0);
    w1.rotation.y = Math.PI / 2;
    var w2 = mesh(new THREE.CircleGeometry(0.26, 14), wingMatR, 0.28, 0.06, 0);
    w2.rotation.y = Math.PI / 2;
    bw.add(w1); bw.add(w2);
    // 下层小翅
    var w3 = mesh(new THREE.CircleGeometry(0.18, 12), wingMatR, -0.2, -0.18, 0);
    w3.rotation.y = Math.PI / 2;
    var w4 = mesh(new THREE.CircleGeometry(0.18, 12), wingMatL, 0.2, -0.18, 0);
    w4.rotation.y = Math.PI / 2;
    bw.add(w3); bw.add(w4);
    bw.position.y = 0.4;
    g.add(bw);

    var bm = new THREE.Group();
    bm.add(mesh(new THREE.CapsuleGeometry(0.05, 0.3, 4, 6), bodyM, 0, 0.4, 0));
    // 触角
    [-1, 1].forEach(function (s) {
      var an = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 4), bodyM, s * 0.06, 0.68, 0);
      an.rotation.z = s * 0.5;
      bm.add(an);
      bm.add(mesh(new THREE.SphereGeometry(0.035, 6, 6), lm(0xffe36b), s * 0.12, 0.79, 0));
    });
    g.add(bm);

    return { root: g, body: g, wings: [w1, w2, w3, w4], kind: 'butterfly' };
  }

  /* ---------- 独角兽 ---------- */
  function buildUnicorn() {
    var g = new THREE.Group();
    var body = new THREE.Group();
    g.add(body);
    var fur = lm(0xfff8fb), mane = lm(0xffb3dd), horn = lm(0xffd75e);

    // 身体
    body.add(mesh(new THREE.SphereGeometry(0.6, 16, 14), fur, 0, 0.95, 0, 1, 0.95, 1.4));
    // 脖子
    var neck = mesh(new THREE.CapsuleGeometry(0.2, 0.6, 4, 10), fur, 0, 1.6, 0.5);
    neck.rotation.x = -0.7;
    body.add(neck);
    // 头
    var head = mesh(new THREE.SphereGeometry(0.34, 14, 12), fur, 0, 2.0, 0.78, 0.85, 0.9, 1.25);
    body.add(head);
    // 独角
    var h = mesh(new THREE.ConeGeometry(0.09, 0.55, 8), horn, 0, 2.42, 0.78);
    h.rotation.x = -0.15;
    body.add(h);
    // 鬃毛（彩色）
    for (var i = 0; i < 6; i++) {
      var mh = mesh(new THREE.SphereGeometry(0.16, 10, 8), mane, 0, 2.0 - i * 0.02, 0.5 - i * 0.09, 1, 0.8, 0.7);
      body.add(mh);
    }
    // 耳朵
    [-0.2, 0.2].forEach(function (x) {
      var e = mesh(new THREE.ConeGeometry(0.09, 0.22, 6), fur, x, 2.2, 0.72);
      e.rotation.x = -0.3;
      e.rotation.z = x > 0 ? -0.3 : 0.3;
      body.add(e);
    });
    // 眼睛
    [-0.14, 0.14].forEach(function (x) {
      body.add(mesh(new THREE.SphereGeometry(0.08, 10, 8), lm(0x5b4a9e), x, 2.06, 1.06));
      body.add(mesh(new THREE.SphereGeometry(0.03, 6, 6), lm(0xffffff), x + 0.03, 2.1, 1.1));
    });
    // 鼻子 + 腮红
    body.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), lm(0xffb3c9), 0, 1.92, 1.14));
    [-0.26, 0.26].forEach(function (x) {
      body.add(mesh(new THREE.SphereGeometry(0.1, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0xffa8c8, transparent: true, opacity: 0.65 }), x, 1.94, 1.02));
    });
    // 四条腿
    [-0.3, 0.3].forEach(function (x) {
      [-0.42, 0.44].forEach(function (z) {
        body.add(mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.9, 8), fur, x, 0.45, z));
        body.add(mesh(new THREE.SphereGeometry(0.12, 8, 6), mane, x, 0.05, z + 0.03, 1, 0.6, 1.2));
      });
    });
    // 尾巴
    var tail = new THREE.Group();
    tail.position.set(0, 1.0, -0.66);
    for (var t = 0; t < 4; t++) {
      tail.add(mesh(new THREE.SphereGeometry(0.18 - t * 0.02, 10, 8), mane, 0, -t * 0.2, -t * 0.12, 0.8, 1.2, 0.8));
    }
    body.add(tail);
    // 背上小翅膀
    var wingMat = new THREE.MeshLambertMaterial({
      color: 0xdff4ff, transparent: true, opacity: 0.68, side: THREE.DoubleSide
    });
    // 绕 Y 轴只转 ±0.55：转到 ±π/2（90°）时，从斜后方看会缩成零厚度细线，
    // 看起来像独角兽没长翅膀。
    var wL = mesh(new THREE.CircleGeometry(0.48, 16), wingMat, -0.4, 1.66, -0.08);
    wL.rotation.set(0, -0.55, 0.42);
    var wR = mesh(new THREE.CircleGeometry(0.48, 16), wingMat, 0.4, 1.66, -0.08);
    wR.rotation.set(0, 0.55, -0.42);
    body.add(wL); body.add(wR);

    // 脖子上的花环
    for (var f = 0; f < 5; f++) {
      var a = (f / 5) * Math.PI * 2;
      body.add(mesh(new THREE.SphereGeometry(0.08, 8, 6),
        lm([0xff8fa8, 0xffe36b, 0x8fe6a8, 0x8fd0ff, 0xc8a8ff][f]),
        Math.cos(a) * 0.22, 1.5, 0.42 + Math.sin(a) * 0.1));
    }

    return { root: g, body: body, head: head, wings: [wL, wR], tail: tail, kind: 'unicorn' };
  }

  var BUILDERS = {
    rabbit: buildRabbit,
    cat: buildCat,
    deer: buildDeer,
    bear: buildBear,
    butterfly: buildButterfly,
    unicorn: buildUnicorn
  };

  /* ===========================================================
   * NPC 管理器
   * =========================================================== */
  function NPCManager(scene, garden) {
    this.scene = scene;
    this.garden = garden;
    this.npcs = [];       // 所有 NPC
    this.time = 0;
    this.pickables = [];  // 供射线检测的可点击对象
  }

  /**
   * 添加一只 NPC
   * @param {string} kind rabbit/cat/deer/bear/butterfly/unicorn
   * @param {THREE.Vector3|{x,z}} pos 位置
   * @param {object} opt  { name, task, lines, scale, home }
   */
  NPCManager.prototype.add = function (kind, pos, opt) {
    opt = opt || {};
    var rig = BUILDERS[kind]();
    if (!rig) return null;

    rig.root.scale.setScalar(opt.scale || 1);
    rig.root.position.set(pos.x, opt.flyHeight || 0, pos.z);
    rig.root.userData = {
      kind: 'npc',
      npcType: kind,
      task: opt.task || null,
      name: opt.name || '小动物',
      lines: opt.lines || ['你好呀！'],
      id: opt.id || (kind + '_' + Math.floor(Math.random() * 1000))
    };
    // 每一层都挂上 npc 标记，这样射线命中子物体也能识别
    rig.root.traverse(function (o) {
      if (o.isMesh) o.userData.npcRoot = rig.root;
    });

    this.scene.add(rig.root);

    var npc = {
      kind: kind,
      root: rig.root,
      body: rig.body,
      head: rig.head,
      arms: rig.armR ? [rig.armL, rig.armR] : null,
      wings: rig.wings || null,
      tail: rig.tail || null,
      home: new THREE.Vector3(pos.x, opt.flyHeight || 0, pos.z),
      target: new THREE.Vector3(pos.x, opt.flyHeight || 0, pos.z),
      wanderTimer: Math.random() * 4,
      phase: Math.random() * Math.PI * 2,
      greetTimer: 0,        // 打招呼动画剩余时间
      greeted: false,
      name: opt.name || '',
      task: opt.task || null,
      lines: opt.lines || [],
      fly: kind === 'butterfly',
      speed: kind === 'butterfly' ? 2.6 : 1.5
    };
    this.npcs.push(npc);
    this.pickables.push(rig.root);
    return npc;
  };

  /**
   * 找一只 NPC
   * @param {string} task 关联的任务 id
   */
  NPCManager.prototype.findByTask = function (task) {
    for (var i = 0; i < this.npcs.length; i++) {
      if (this.npcs[i].task === task) return this.npcs[i];
    }
    return null;
  };

  NPCManager.prototype.find = function (kind) {
    for (var i = 0; i < this.npcs.length; i++) {
      if (this.npcs[i].kind === kind) return this.npcs[i];
    }
    return null;
  };

  /**
   * 每帧更新：待机动画、随机溜达、看到玩家时跳+挥手
   * @param {THREE.Vector3} playerPos
   * @param {number} dt
   */
  NPCManager.prototype.update = function (dt, playerPos) {
    this.time += dt;
    var t = this.time;

    for (var i = 0; i < this.npcs.length; i++) {
      var n = this.npcs[i];

      // 玩家靠近（3.2 单位内）且还没打过招呼 → 触发跳+挥手
      if (!n.greeted && n.kind !== 'butterfly') {
        var d = Math.hypot(playerPos.x - n.root.position.x, playerPos.z - n.root.position.z);
        if (d < 3.4) {
          n.greeted = true;
          n.greetTimer = 1.6;
        }
      }

      if (n.fly) {
        // 蝴蝶：绕花田飞来飞去 + 翅膀高频扇动
        n.wanderTimer -= dt;
        if (n.wanderTimer <= 0) {
          n.wanderTimer = 2.4 + Math.random() * 2.6;
          var a = Math.random() * Math.PI * 2;
          var r = 2.5 + Math.random() * 5;
          n.target.set(
            (this.garden && this.garden.flowerArea ? this.garden.flowerArea.x : 4) + Math.cos(a) * r,
            1.6 + Math.random() * 1.4,
            (this.garden && this.garden.flowerArea ? this.garden.flowerArea.z : -2) + Math.sin(a) * r
          );
        }
        var bp = n.root.position;
        bp.lerp(n.target, Math.min(1, dt * 1.2));
        bp.y += Math.sin(t * 4 + n.phase) * 0.006;
        if (n.wings) {
          var flap = Math.sin(t * 26 + n.phase);
          n.wings[0].rotation.y = Math.PI / 2 + flap * 0.8;
          n.wings[1].rotation.y = -Math.PI / 2 - flap * 0.8;
          n.wings[2].rotation.y = Math.PI / 2 + flap * 0.8;
          n.wings[3].rotation.y = -Math.PI / 2 - flap * 0.8;
        }
        // 始终面向飞行方向
        n.root.rotation.y = Math.atan2(n.target.x - bp.x, n.target.z - bp.z);
        continue;
      }

      // 打招呼：跳起来 + 挥手
      if (n.greetTimer > 0) {
        n.greetTimer -= dt;
        var gt = 1 - n.greetTimer / 1.6;
        // 跳
        n.root.position.y = Math.abs(Math.sin(gt * Math.PI * 2)) * 0.85;
        // 挥手（熊和小鹿有手臂；其他用身体左右摇）
        if (n.arms) {
          n.arms[1].rotation.z = -2.2 + Math.sin(gt * 18) * 0.5;
        } else {
          n.root.rotation.z = Math.sin(gt * 14) * 0.14;
        }
        // 面向玩家
        n.root.rotation.y = Math.atan2(playerPos.x - n.root.position.x, playerPos.z - n.root.position.z);
        if (n.greetTimer <= 0) {
          n.root.position.y = 0;
          n.root.rotation.z = 0;
          if (n.arms) n.arms[1].rotation.z = 0;
        }
        continue;
      }

      // 待机：呼吸 + 慢慢左右晃 + 偶尔转头看玩家
      var br = Math.sin(t * 2 + n.phase);
      n.root.position.y = 0;
      if (n.body) {
        n.body.position.y = br * 0.045;
        n.body.rotation.z = br * 0.02;
      }
      n.root.rotation.y = Math.sin(t * 0.55 + n.phase) * 0.35;

      // 独角兽的翅膀扇动（绕 Z 轴上下拍）
      if (n.wings && n.kind === 'unicorn') {
        var w = Math.sin(t * 3.2 + n.phase) * 0.3;
        n.wings[0].rotation.z = 0.42 + w;
        n.wings[1].rotation.z = -0.42 - w;
      }
      // 猫摇尾巴
      if (n.tail && n.kind === 'cat') {
        n.tail.rotation.z = Math.sin(t * 4 + n.phase) * 0.4;
        n.tail.rotation.x = Math.sin(t * 3 + n.phase) * 0.2;
      }
      if (n.tail && n.kind === 'unicorn') {
        n.tail.rotation.x = Math.sin(t * 2.4 + n.phase) * 0.18;
      }

      // 极缓慢的小溜达（幅度很小，不会走丢也不会挡路）
      // 注意：如果这只 NPC 正在被某个小游戏"带走"（例如 MG4 的小猫跟着玩家走），
      // 必须跳过溜达和位置回写，否则会和跟随逻辑互相拉扯，任务永远完不成。
      if (n.locked) {
        n.root.rotation.y = Math.atan2(
          playerPos.x - n.root.position.x,
          playerPos.z - n.root.position.z
        );
        continue;
      }
      n.wanderTimer -= dt;
      if (n.wanderTimer <= 0) {
        n.wanderTimer = 3.5 + Math.random() * 4;
        var ang = Math.random() * Math.PI * 2;
        n.target.set(
          n.home.x + Math.cos(ang) * 1.8,
          0,
          n.home.z + Math.sin(ang) * 1.8
        );
      }
      var np = n.root.position;
      np.lerp(n.target, Math.min(1, dt * 0.6));
      np.y = 0;
    }
  };

  /**
   * 让所有动物一起庆祝（完成任务 / 通关时用）
   */
  NPCManager.prototype.celebrate = function () {
    for (var i = 0; i < this.npcs.length; i++) {
      this.npcs[i].greetTimer = 2.4;
      this.npcs[i].greeted = true;
    }
  };

  /* ===========================================================
   * AI 伙伴「小星星」
   * =========================================================== */
  var AICompanion = {

    /* 本地儿童对话库（离线可用） */
    dialogue: {
      idle: [
        '我在这儿陪着你呀～',
        '花园里好漂亮，我们一起看看吧！',
        '你想先去找哪个小动物呢？'
      ],
      guide: [
        '我们去看看小兔子吧！',
        '那里好像有一朵漂亮的小花！',
        '小桥对面有什么呢？',
        '跟我来吧，我带你去看看！',
        '哇，那边有发光的东西！'
      ],
      praise: [
        '你真棒！',
        '好厉害呀！',
        '你做到了！',
        '我为你鼓掌！'
      ],
      hint: [
        '要不要点点小动物试试看？',
        '轻轻点一下草地，小朵朵就走过去啦',
        '这里有一个会发光的东西哦～'
      ]
    },

    /**
     * 大模型 API 接口预留
     * ------------------------------------------------------------
     * 现在返回本地对话库的句子。
     * 未来接入大模型时，只要调用 AICompanion.setRemoteTalker(fn)，
     * 传入一个返回 Promise<string> 的函数即可，其余代码无需改动。
     *
     * 例：
     *   AICompanion.setRemoteTalker(function (ctx) {
     *     return fetch('https://api.example.com/v1/chat', {...}).then(r => r.json())
     *   });
     */
    _remoteTalker: null,

    /**
     * 注册远程大模型（预留接口）
     * @param {function} fn 接收 {text, sceneState} 返回 Promise<string>
     */
    setRemoteTalker: function (fn) {
      this._remoteTalker = fn;
    },

    /**
     * 说一句话（优先用远程大模型，失败则回落到本地库）
     * @param {string} group dialogue 里的分类
     * @param {object} ctx  场景上下文（未来传给大模型）
     */
    say: function (group, ctx) {
      var self = this;
      if (this._remoteTalker) {
        try {
          return Promise.resolve(this._remoteTalker({
            text: group, sceneState: ctx || {}
          })).then(function (r) {
            return (typeof r === 'string' && r.trim()) ? r : self._local(group);
          })['catch'](function () {
            return self._local(group);
          });
        } catch (e) {
          return Promise.resolve(this._local(group));
        }
      }
      return Promise.resolve(this._local(group));
    },

    _local: function (group) {
      var arr = this.dialogue[group] || this.dialogue.idle;
      return arr[Math.floor(Math.random() * arr.length)];
    }
  };

  /* ---------- 小星星的 3D 模型 ---------- */
  function buildStarBuddy() {
    var g = new THREE.Group();
    var starMat = new THREE.MeshLambertMaterial({
      color: 0xfff0a0, emissive: 0xffcc44, emissiveIntensity: 0.7
    });
    var glowMat = new THREE.MeshLambertMaterial({
      color: 0xfff8d0, emissive: 0xffdd66, emissiveIntensity: 0.4,
      transparent: true, opacity: 0.45
    });

    // 星星主体
    var shape = new THREE.Shape();
    var pts = 5, outer = 0.42, inner = 0.19;
    for (var i = 0; i < pts * 2; i++) {
      var r = (i % 2 === 0) ? outer : inner;
      var a = (i * Math.PI / pts) - Math.PI / 2;
      var x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.16, bevelEnabled: true, bevelSize: 0.05,
      bevelThickness: 0.05, bevelSegments: 2
    });
    var star = new THREE.Mesh(geo, starMat);
    star.scale.set(1, 1, 0.55);
    star.castShadow = true;
    g.add(star);

    // 光晕
    var halo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 12), glowMat);
    halo.scale.set(1, 1, 0.4);
    g.add(halo);

    // 小脸
    [-0.11, 0.11].forEach(function (x) {
      var e = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0x5a4020 }));
      e.position.set(x, 0.04, 0.25);
      g.add(e);
      var h = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6),
        new THREE.MeshLambertMaterial({ color: 0xffffff }));
      h.position.set(x + 0.02, 0.06, 0.3);
      g.add(h);
    });
    var smile = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 10, Math.PI),
      new THREE.MeshLambertMaterial({ color: 0x5a4020 }));
    smile.position.set(0, -0.06, 0.27);
    smile.rotation.z = Math.PI;
    g.add(smile);
    // 腮红
    [-0.2, 0.2].forEach(function (x) {
      var b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6),
        new THREE.MeshLambertMaterial({ color: 0xffb0a0, transparent: true, opacity: 0.6 }));
      b.position.set(x, -0.04, 0.22);
      b.scale.set(1, 0.7, 0.4);
      g.add(b);
    });

    return { root: g, star: star, halo: halo };
  }

  /* ---------- 小星星行为控制器 ---------- */
  function StarBuddy(scene, garden) {
    var b = buildStarBuddy();
    this.scene = scene;
    this.root = b.root;
    this.star = b.star;
    this.halo = b.halo;
    scene.add(this.root);

    this.garden = garden;
    this.pos = new THREE.Vector3(2, 2.2, 12);
    this.target = this.pos.clone();
    this.time = 0;
    this.mode = 'follow';       // follow | guide
    this.phase = 0;
    this.guideTarget = null;    // 指引时飞向的目标位置
  }

  /**
   * 指路：飞向某个位置
   * @param {THREE.Vector3|{x,y,z}} pos 目标位置
   */
  StarBuddy.prototype.guideTo = function (pos, dur) {
    this.mode = 'guide';
    // 允许传普通对象（游戏里很多地方传的是 {x, y, z}），
    // 这里统一转成 Vector3，避免调用方踩 pos.clone is not a function
    this.guideTarget = (pos && typeof pos.clone === 'function')
      ? pos.clone()
      : new THREE.Vector3(pos ? pos.x : 0, pos ? pos.y : 0, pos ? pos.z : 0);
    this.guideDur = dur || 2.4;
    this.guideT = 0;
  };

  StarBuddy.prototype.stopGuide = function () {
    this.mode = 'follow';
    this.guideTarget = null;
  };

  StarBuddy.prototype.update = function (dt, playerPos) {
    this.time += dt;
    var t = this.time;

    if (this.mode === 'guide' && this.guideTarget) {
      this.guideT += dt;
      // 飞向指引点，并在其上方转圈
      var g = this.guideTarget;
      var a = t * 3.4;
      this.target.set(g.x + Math.cos(a) * 1.6, 3.0, g.z + Math.sin(a) * 1.6);
      if (this.guideT > this.guideDur) this.stopGuide();
    } else {
      // 常态：在玩家身边漂浮
      var a2 = t * 1.3 + this.phase;
      this.target.set(
        playerPos.x + Math.cos(a2) * 2.0,
        2.4 + Math.sin(t * 2.2 + this.phase) * 0.35,
        playerPos.z + Math.sin(a2) * 2.0
      );
    }

    // 平滑移动
    this.pos.lerp(this.target, Math.min(1, dt * 2.6));
    this.root.position.copy(this.pos);

    // 自转 + 上下浮动
    this.star.rotation.y += dt * 1.4;
    this.root.position.y += Math.sin(t * 3) * 0.004;
    this.halo.scale.setScalar(1 + Math.sin(t * 2.6) * 0.12);

    // 引导模式下更亮一点（提示"看我这里"）
    var glow = this.mode === 'guide' ? 0.9 : 0.4;
    this.halo.material.emissiveIntensity = glow;
  };

  global.DDNPC = NPCManager;
  global.DDStarBuddy = StarBuddy;
  global.DDAICompanion = AICompanion;
})(window);
