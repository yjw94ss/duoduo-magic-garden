/* ===========================================================
 * world.js —— 彩虹花园：全部用 Three.js 基础几何体程序化生成
 *
 * 包含：草地 / 池塘 / 木桥 / 彩虹门 / 小房子 / 花田 /
 *       糖果树 / 蘑菇 / 气球 / 云朵 / 彩虹 / 边界树墙
 *
 * 性能约定：低多边形、低面数、共享材质与几何体，控制在 60FPS
 * =========================================================== */
(function (global) {
  'use strict';

  var THREE = global.THREE;

  /* ===========================================================
   * 材质工厂：集中创建并复用，避免重复 new
   * =========================================================== */
  var MAT = {};
  var GEO = {};

  function initAssets() {
    // ---------- 材质 ----------
    MAT.grass    = lambert(0x8ede9f);
    MAT.grass2   = lambert(0x7fd694);
    MAT.soil      = lambert(0xd9a978);
    MAT.water     = lambert(0x74d2f0);
    MAT.waterDeep = lambert(0x4fb8de);
    MAT.wood      = lambert(0xc79358);
    MAT.woodDark  = lambert(0xa9773f);
    MAT.leaf      = lambert(0x6fcf82);
    MAT.leaf2     = lambert(0x5cbf70);
    MAT.bark      = lambert(0xbb8a5c);
    MAT.white     = lambert(0xfffdf6);
    MAT.cream     = lambert(0xfff3dc);
    MAT.pink      = lambert(0xffb3d1);
    MAT.pinkDark  = lambert(0xff8fb8);
    MAT.purple    = lambert(0xc4a2ff);
    MAT.blue      = lambert(0x9ad4ff);
    MAT.blueDark  = lambert(0x6fb8f0);
    MAT.yellow    = lambert(0xffe08a);
    MAT.orange    = lambert(0xffb072);
    MAT.red       = lambert(0xff8a9b);
    MAT.mint      = lambert(0x9fe8cf);
    MAT.gray      = lambert(0xd8d2c8);
    MAT.cloud     = lambert(0xffffff);
    MAT.cloud2    = lambert(0xf4faff);
    MAT.flowerRed = lambert(0xff6f8b);
    MAT.flowerYel = lambert(0xffd93d);
    MAT.flowerBlu = lambert(0x5bb8ff);
    MAT.flowerPur = lambert(0xb78cff);
    MAT.flowerWht = lambert(0xffffff);

    // 彩虹七色（用发光感更强的材质）
    MAT.rainbow = [
      lambert(0xff6b6b), lambert(0xff9f43), lambert(0xffd93d), lambert(0x6bdc7a),
      lambert(0x4fc3f7), lambert(0x5b7cfa), lambert(0xb06bff)
    ];

    // 宝石五色（红橙黄绿蓝）
    MAT.gem = [
      lambert(0xff5f7e), lambert(0xffa14f), lambert(0xffd93d),
      lambert(0x63d68a), lambert(0x5bb8ff)
    ];

    // 会发光的材质（用 emissive 模拟，不占用真实光源）
    MAT.glowGold = new THREE.MeshLambertMaterial({
      color: 0xfff3a0, emissive: 0xffcc33, emissiveIntensity: 0.6
    });
    MAT.glowWhite = new THREE.MeshLambertMaterial({
      color: 0xffffff, emissive: 0xffeecc, emissiveIntensity: 0.5
    });

    // ---------- 几何体（共享） ----------
    GEO.sphere   = new THREE.SphereGeometry(1, 18, 14);
    GEO.sphereLo = new THREE.SphereGeometry(1, 10, 8);
    GEO.box      = new THREE.BoxGeometry(1, 1, 1);
    GEO.cyl      = new THREE.CylinderGeometry(1, 1, 1, 14);
    GEO.cylLo    = new THREE.CylinderGeometry(1, 1, 1, 8);
    GEO.cone     = new THREE.ConeGeometry(1, 1, 14);
    GEO.coneLo   = new THREE.ConeGeometry(1, 1, 8);
    GEO.plane    = new THREE.PlaneGeometry(1, 1);
    GEO.circle   = new THREE.CircleGeometry(1, 28);
    GEO.torus    = new THREE.TorusGeometry(1, 0.12, 8, 26);
    GEO.capsule  = new THREE.CapsuleGeometry(0.5, 0.8, 4, 10);
  }

  function lambert(color) {
    return new THREE.MeshLambertMaterial({ color: color });
  }

  /**
   * 生成一个"不规则圆形"几何体
   *
   * 用途：草斑、土坡的地面色块。
   * 如果用标准的 CircleGeometry，这些色块边缘是完美的圆弧，
   * 看起来就像"贴纸铺在草地上"，很假。
   * 把每个顶点的半径加上随机扰动，边缘就会变得自然。
   *
   * @param {number} seg 分段数
   * @param {number} rough 边缘不规则程度 0~1
   * @param {number} jag 边缘锯齿强度 0~1
   * @param {function} rnd 随机函数
   */
  function makeBlobGeometry(seg, rough, jag, rnd) {
    var positions = [0, 0, 0];      // 中心点
    var indices = [];
    for (var i = 0; i < seg; i++) {
      var a = (i / seg) * Math.PI * 2;
      // 两个不同频率的正弦叠加 + 随机，边缘既不规则又不至于太碎
      var r = 1
        + Math.sin(a * 3 + 1.2) * 0.12 * rough
        + Math.sin(a * 5 + 0.4) * 0.08 * jag
        + (rnd() - 0.5) * 0.10 * rough;
      positions.push(Math.cos(a) * r, Math.sin(a) * r, 0);
    }
    // 扇形三角化
    for (var k = 0; k < seg; k++) {
      var a1 = 1 + k;
      var a2 = 1 + ((k + 1) % seg);
      indices.push(0, a2, a1);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /* ===========================================================
   * 小工具
   * =========================================================== */

  /**
   * 创建一个使用共享几何体的 Mesh
   * @param {string} geoKey GEO 里的键
   * @param {THREE.Material} mat 材质
   * @param {number} x,y,z 位置
   * @param {number} sx,sy,sz 缩放
   */
  function mk(geoKey, mat, x, y, z, sx, sy, sz) {
    var m = new THREE.Mesh(GEO[geoKey], mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.scale.set(
      sx === undefined ? 1 : sx,
      sy === undefined ? 1 : sy,
      sz === undefined ? 1 : sz
    );
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  /**
   * 生成一个"稳定的伪随机"（保证每次刷新场景一样，避免孩子找不到东西）
   */
  function seededRandom(seed) {
    var s = seed;
    return function () {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  /* ===========================================================
   * 彩虹花园
   * =========================================================== */
  function RainbowGarden(scene, cfg) {
    var G = new THREE.Group();
    G.name = 'RainbowGarden';
    scene.add(G);

    var rnd = seededRandom(20261007);
    var api = {
      group: G,
      radius: cfg.radius,
      coreRadius: cfg.coreRadius || 32,   // 核心活动区：任务点都在这里
      midRadius: cfg.midRadius || 56,     // 中环：探索区
      interactables: [],     // 可点击对象列表（射线检测用）
      waterArea: null,       // 水域（禁止进入）
      housePos: new THREE.Vector3(16, 0, -14),
      bridgePos: new THREE.Vector3(-2, 0, 10),
      gatePos: new THREE.Vector3(0, 0, -30),
      rabbitPos: new THREE.Vector3(-14, 0, 4),
      catPos: new THREE.Vector3(10, 0, 8),
      duckArea: null,
      flowerArea: new THREE.Vector3(4, 0, -2)
    };

    buildGround(api, cfg, rnd);
    buildPond(api, rnd);
    buildRainbowGate(api);
    buildHouse(api);
    buildFlowerField(api, rnd);
    buildTrees(api, rnd);
    buildClouds(api, rnd);
    buildMushrooms(api, rnd);
    buildBalloons(api, rnd);
    buildExploration(api, rnd);      // 探索区：深处的新景物
    buildBoundary(api, rnd);
    buildRainbowSky(api);

    return api;
  }

  /* ---------- 1. 草地（中心平坦绿坪 + 远处起伏丘陵） ---------- */
  function buildGround(api, cfg, rnd) {
    var g = new THREE.Group();

    // 主草地：整张地图的底
    var ground = new THREE.Mesh(
      new THREE.CircleGeometry(cfg.radius, 72),
      MAT.grass
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    g.add(ground);

    // 外圈深一点的草地，视觉上"包住"地图，孩子一眼看出边界
    var outer = new THREE.Mesh(
      new THREE.RingGeometry(cfg.radius, cfg.radius + 26, 72),
      MAT.grass2
    );
    outer.rotation.x = -Math.PI / 2;
    outer.position.y = -0.02;
    g.add(outer);

    // 草斑：按分区铺，中心少一些、探索区多一些，避免大地图显得空
    var patchColors = [MAT.grass2, MAT.grass, MAT.grass, MAT.mint];
    for (var i = 0; i < 20; i++) {
      var ang = rnd() * Math.PI * 2;
      // 中心区草斑少而大，外圈草斑多而小，制造"越往深处越丰富"的感觉
      var near = i < 7;
      var dist = near
        ? 6 + rnd() * (api.coreRadius - 10)
        : api.coreRadius + rnd() * (cfg.radius - api.coreRadius - 12);
      var r = near ? (4 + rnd() * 6) : (3 + rnd() * 7);
      var patch = new THREE.Mesh(
        makeBlobGeometry(12, 0.62 + rnd() * 0.3, 0.7 + rnd() * 0.5, rnd),
        patchColors[i % 4]
      );
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(
        Math.cos(ang) * dist, 0.008 + i * 0.0005, Math.sin(ang) * dist
      );
      patch.scale.set(r, r, 1);
      patch.receiveShadow = true;
      g.add(patch);
    }

    // 远处丘陵：外圈做出明显起伏，让地平线有层次（孩子能看到"远处还有山"）
    // 同样把球心埋深，只露出顶部，避免出现生硬的圆盘边缘
    for (var j = 0; j < 16; j++) {
      var a2 = (j / 16) * Math.PI * 2 + 0.25;
      var d2 = cfg.radius * 0.82 + (j % 3) * 6;
      var hr = 10 + (j % 4) * 3;
      var hill = mk('sphere', j % 2 ? MAT.grass2 : MAT.leaf2,
        Math.cos(a2) * d2, -hr * 0.95, Math.sin(a2) * d2,
        hr, hr * 0.55, hr);
      hill.castShadow = false;
      hill.receiveShadow = false;
      g.add(hill);
    }

    // 中环的缓坡：探索区的地标，孩子可以绕着走。
    // 关键：球心要埋在地面以下，只露出一点点顶部。
    // 如果球心在地面附近，会露出一个边缘生硬的圆盘（像贴纸），很假。
    for (var k = 0; k < 7; k++) {
      var a3 = (k / 7) * Math.PI * 2 + 1.1;
      var d3 = api.coreRadius + 8 + (k % 3) * 9;
      var knollR = 7 + (k % 3) * 2;
      // 球心下沉，只露出顶部 0.3~0.7，形成柔和的丘
      var knoll = mk('sphere', MAT.grass2,
        Math.cos(a3) * d3, -knollR * 0.92, Math.sin(a3) * d3,
        knollR, knollR * 0.5, knollR);
      knoll.castShadow = true;
      knoll.receiveShadow = true;
      g.add(knoll);
    }

    api.group.add(g);
    api.groundMesh = ground;
  }

  /* ---------- 2. 池塘 + 水波 + 木桥 ---------- */
  function buildPond(api, rnd) {
    var g = new THREE.Group();
    var px = -18, pz = 14;   // 池塘中心

    // 池底
    var bottom = new THREE.Mesh(new THREE.CircleGeometry(9, 40), MAT.soil);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.set(px, 0.02, pz);
    bottom.receiveShadow = true;
    g.add(bottom);

    // 水面
    var water = new THREE.Mesh(new THREE.CircleGeometry(8.4, 40), MAT.water);
    water.rotation.x = -Math.PI / 2;
    water.position.set(px, 0.16, pz);
    water.receiveShadow = false;
    g.add(water);

    // 岸边：一圈浅色沙
    var shore = new THREE.Mesh(new THREE.RingGeometry(8.4, 9.6, 40), MAT.cream);
    shore.rotation.x = -Math.PI / 2;
    shore.position.set(px, 0.06, pz);
    g.add(shore);

    // 水面波纹（几个同心圆环，缓慢缩放做动态）
    var ripples = [];
    for (var i = 0; i < 3; i++) {
      var rip = new THREE.Mesh(
        new THREE.RingGeometry(1.6 + i * 1.5, 1.75 + i * 1.5, 32),
        MAT.waterDeep
      );
      rip.rotation.x = -Math.PI / 2;
      rip.position.set(px, 0.2 + i * 0.005, pz);
      rip.userData.ripple = true;
      g.add(rip);
      ripples.push(rip);
    }

    // ---------- 木桥（斜跨池塘，保留"看得见桥、走得过去"的关系） ----------
    // 注意：池塘附近的 balloon 位置已避开，避免遮挡孩子数鸭子时的视线。
    var bridge = new THREE.Group();
    bridge.position.set(px, 0, pz);
    bridge.rotation.y = 0.42;   // 斜着放，视野更开阔

    // 桥面木板：池塘半径 8.2，桥要伸出两端各约 1.5
    var PLANKS = 19;
    var PLANK_STEP = 0.95;
    var bridgeHalf = (PLANKS - 1) / 2 * PLANK_STEP;   // ≈ 8.55
    for (var b = 0; b < PLANKS; b++) {
      var plank = mk('box', b % 2 === 0 ? MAT.wood : MAT.woodDark,
        0, 0.26, -bridgeHalf + b * PLANK_STEP, 2.6, 0.2, 0.8);
      bridge.add(plank);
    }

    // 两侧低栏杆（做矮一点，孩子一眼能看到前面）
    [-1.3, 1.3].forEach(function (sx) {
      for (var p = 0; p < 6; p++) {
        var post = mk('cylLo', MAT.woodDark, sx, 0.55, -bridgeHalf + 0.9 + p * (bridgeHalf * 2 - 1.8) / 5,
          0.14, 0.9, 0.14);
        bridge.add(post);
      }
      var rail = mk('box', MAT.wood, sx, 0.95, 0, 0.14, 0.14, bridgeHalf * 2);
      bridge.add(rail);
    });

    g.add(bridge);
    api.bridgeMesh = bridge;
    api.bridgePos = new THREE.Vector3(px, 0, pz);
    api.bridgeRotY = 0.42;

    // 池塘边的荷叶 + 小睡莲
    for (var l = 0; l < 7; l++) {
      var la = rnd() * Math.PI * 2;
      var lr = 3 + rnd() * 4.4;
      var lotus = new THREE.Mesh(GEO.circle, MAT.leaf);
      lotus.rotation.x = -Math.PI / 2;
      lotus.position.set(px + Math.cos(la) * lr, 0.18, pz + Math.sin(la) * lr);
      lotus.scale.set(0.8 + rnd() * 0.7, 0.8 + rnd() * 0.7, 1);
      g.add(lotus);
    }

    // 记录水域信息（供玩家移动阻挡使用）
    api.waterArea = { x: px, z: pz, r: 8.2 };
    // 桥面可走区域。因为桥是斜的（旋转 0.42 弧度），
    // 判定时要把点反向旋转到"桥的局部坐标系"再比 hw/hd。
    api.bridgeArea = {
      x: px, z: pz,
      hw: 1.25,                              // 桥半宽（对应桥面 2.6 宽）
      hd: bridgeHalf + 0.4,
      rotY: bridge.rotation.y
    };

    api.pondGroup = g;
    api.group.add(g);
    api.waterRings = ripples;
  }

  /* ---------- 3. 彩虹门 ---------- */
  function buildRainbowGate(api) {
    var g = new THREE.Group();
    g.position.set(0, 0, -30);

    // 七道同心半圆拱门
    for (var i = 0; i < 7; i++) {
      var r = 5.0 - i * 0.62;
      var arc = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.30, 8, 32, Math.PI),
        MAT.rainbow[i]
      );
      arc.position.y = 0.2;
      arc.castShadow = true;
      g.add(arc);
    }

    // 门柱：两个大蘑菇柱
    [-5.6, 5.6].forEach(function (x) {
      var pole = mk('cyl', MAT.wood, x, 2.6, 0, 0.4, 5.2, 0.4);
      g.add(pole);
      var cap = mk('sphere', MAT.pink, x, 5.4, 0, 0.95, 0.5, 0.95);
      g.add(cap);
      var dot = mk('sphereLo', MAT.white, x, 5.85, 0, 0.34, 0.24, 0.34);
      g.add(dot);
    });

    // 门上一朵大花
    var topFlower = new THREE.Group();
    topFlower.position.set(0, 6.1, 0);
    for (var p = 0; p < 6; p++) {
      var a = (p / 6) * Math.PI * 2;
      var petal = mk('sphereLo', MAT.pink, Math.cos(a) * 0.85, Math.sin(a) * 0.85, 0, 0.55, 0.55, 0.3);
      petal.rotation.z = a;
      topFlower.add(petal);
    }
    topFlower.add(mk('sphereLo', MAT.glowGold, 0, 0, 0.05, 0.45, 0.45, 0.3));
    g.add(topFlower);
    api.gateFlower = topFlower;

    api.group.add(g);
    api.gateGroup = g;
  }

  /* ---------- 4. 小房子（带屋顶、烟囱、门、窗） ---------- */
  function buildHouse(api) {
    var g = new THREE.Group();
    g.position.copy(api.housePos);
    g.rotation.y = -0.5;

    // 地基
    var base = mk('cyl', MAT.cream, 0, 0.2, 0, 3.4, 0.4, 3.4);
    g.add(base);

    // 墙体
    var wall = mk('box', MAT.cream, 0, 1.9, 0, 4.2, 3.2, 4.2);
    g.add(wall);

    // 屋顶：四棱锥
    var roof = mk('cone', MAT.pinkDark, 0, 4.1, 0, 3.6, 2.3, 3.6);
    g.add(roof);

    // 屋顶小尖顶
    var knob = mk('sphereLo', MAT.glowGold, 0, 5.35, 0, 0.3, 0.3, 0.3);
    g.add(knob);

    // 烟囱
    var chim = mk('box', MAT.red, 1.3, 4.6, -1.1, 0.6, 1.5, 0.6);
    g.add(chim);

    // 门
    var door = mk('box', MAT.woodDark, 0, 1.5, 2.14, 1.3, 2.2, 0.18);
    g.add(door);
    var knobDoor = mk('sphereLo', MAT.glowGold, 0.45, 1.5, 2.3, 0.14, 0.14, 0.14);
    g.add(knobDoor);

    // 窗户（两侧）
    [-1.3, 1.3].forEach(function (x) {
      var win = mk('box', MAT.blue, x, 2.4, 2.14, 0.95, 0.95, 0.14);
      g.add(win);
      var frame = mk('box', MAT.white, x, 2.4, 2.1, 1.15, 1.15, 0.1);
      g.add(frame);
    });

    // 门前小台阶
    var step = mk('box', MAT.gray, 0, 0.3, 2.7, 1.8, 0.3, 0.9);
    g.add(step);

    // 房子旁边的小栅栏
    for (var f = 0; f < 6; f++) {
      var fx = -3.2 + f * 1.3;
      var post = mk('box', MAT.white, fx, 0.55, 3.2, 0.18, 1.1, 0.18);
      g.add(post);
    }
    var fence = mk('box', MAT.white, 0, 0.85, 3.2, 7.4, 0.16, 0.14);
    g.add(fence);

    // 房顶的小蝴蝶结
    var bow = new THREE.Group();
    bow.position.set(0, 5.0, 1.5);
    var b1 = mk('sphereLo', MAT.pink, -0.35, 0, 0, 0.42, 0.3, 0.2);
    var b2 = mk('sphereLo', MAT.pink, 0.35, 0, 0, 0.42, 0.3, 0.2);
    bow.add(b1); bow.add(b2);
    bow.add(mk('sphereLo', MAT.glowGold, 0, 0, 0.12, 0.2, 0.2, 0.2));
    g.add(bow);

    api.group.add(g);
    api.houseGroup = g;
    // 房子也作为可交互物（点击会走近）
    api.houseGroup.userData = { kind: 'house' };
  }

  /* ---------- 5. 花田（各种颜色的小花，用于颜色认知） ---------- */
  function buildFlowerField(api, rnd) {
    var g = new THREE.Group();
    var fx = api.flowerArea.x, fz = api.flowerArea.z;

    // 花田底：浅色小圆
    var bed = new THREE.Mesh(new THREE.CircleGeometry(8, 36), MAT.leaf2);
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(fx, 0.015, fz);
    bed.receiveShadow = true;
    g.add(bed);

    var petalMats = [MAT.flowerRed, MAT.flowerYel, MAT.flowerBlu, MAT.flowerPur, MAT.flowerWht];
    var flowers = [];
    for (var i = 0; i < 46; i++) {
      var a = rnd() * Math.PI * 2;
      var r = Math.sqrt(rnd()) * 7.2;
      var x = fx + Math.cos(a) * r;
      var z = fz + Math.sin(a) * r;

      var f = new THREE.Group();
      f.position.set(x, 0, z);

      // 茎
      var stem = mk('cylLo', MAT.leaf, 0, 0.42, 0, 0.09, 0.85, 0.09);
      f.add(stem);
      // 两片叶子
      var lf = mk('sphereLo', MAT.leaf, 0.16, 0.35, 0, 0.28, 0.09, 0.16);
      lf.rotation.z = -0.5;
      f.add(lf);

      // 花瓣（5 片）
      var pm = petalMats[i % petalMats.length];
      for (var p = 0; p < 5; p++) {
        var pa = (p / 5) * Math.PI * 2;
        var petal = mk('sphereLo', pm, Math.cos(pa) * 0.24, 0.95, Math.sin(pa) * 0.24,
          0.2, 0.2, 0.11);
        petal.rotation.y = -pa;
        f.add(petal);
      }
      // 花心
      f.add(mk('sphereLo', MAT.glowGold, 0, 0.98, 0, 0.16, 0.16, 0.16));

      // 随机高度、动画用
      f.scale.setScalar(0.8 + rnd() * 0.55);
      f.userData = { baseY: 0, phase: rnd() * Math.PI * 2, isFlower: true };
      g.add(f);
      flowers.push(f);
    }

    api.group.add(g);
    api.flowers = flowers;
  }

  /* ---------- 6. 树：普通树 + 糖果树 ---------- */
  function buildTrees(api, rnd) {
    var g = new THREE.Group();

    // 普通圆球树
    function normalTree(x, z, s) {
      var t = new THREE.Group();
      t.position.set(x, 0, z);
      var h = 2.2 * s;
      t.add(mk('cylLo', MAT.bark, 0, h / 2, 0, 0.35 * s, h, 0.35 * s));
      var c1 = mk('sphere', MAT.leaf, 0, h + 0.9 * s, 0, 1.9 * s, 1.7 * s, 1.9 * s);
      var c2 = mk('sphere', MAT.leaf2, 0.8 * s, h + 0.2 * s, 0.5 * s, 1.3 * s, 1.2 * s, 1.3 * s);
      var c3 = mk('sphere', MAT.leaf, -0.7 * s, h + 0.3 * s, -0.5 * s, 1.2 * s, 1.1 * s, 1.2 * s);
      t.add(c1); t.add(c2); t.add(c3);
      // 树上的小果子
      t.add(mk('sphereLo', MAT.red, 0.5 * s, h + 1.4 * s, 0.9 * s, 0.2, 0.2, 0.2));
      t.add(mk('sphereLo', MAT.orange, -0.9 * s, h + 0.8 * s, 0.6 * s, 0.2, 0.2, 0.2));
      return t;
    }

    // 糖果树：树干像棒棒糖
    function candyTree(x, z, s, colorIdx) {
      var t = new THREE.Group();
      t.position.set(x, 0, z);
      t.add(mk('cylLo', MAT.white, 0, 1.8 * s, 0, 0.3 * s, 3.6 * s, 0.3 * s));
      var top = mk('sphere', MAT.rainbow[colorIdx % 7], 0, 4.2 * s, 0, 1.7 * s, 1.7 * s, 0.55 * s);
      t.add(top);
      // 缠在树干上的条纹
      for (var i = 0; i < 5; i++) {
        var st = mk('torus', MAT.rainbow[(i + colorIdx) % 7], 0, 0.7 + i * 0.65 * s, 0,
          0.42 * s, 0.42 * s, 0.42 * s);
        st.rotation.x = Math.PI / 2;
        t.add(st);
      }
      return t;
    }

    // 沿地图散布
    var treeSpots = [
      [-30, -6], [-26, 22], [24, 22], [30, -2], [10, -26], [-12, -28],
      [34, 14], [-34, 12], [20, -28], [-22, -18]
    ];
    treeSpots.forEach(function (p, i) {
      var s = 0.85 + rnd() * 0.5;
      g.add(normalTree(p[0], p[1], s));
      if (i % 2 === 0) {
        g.add(candyTree(p[0] + 4, p[1] + 3, 0.8 + rnd() * 0.3, i));
      }
    });

    // 花田边两棵糖果树
    g.add(candyTree(-2, 4, 0.95, 0));
    g.add(candyTree(11, -6, 1.0, 3));

    api.group.add(g);
    api.trees = g;
  }

  /* ---------- 7. 云朵（几组飘动的白球） ---------- */
  function buildClouds(api, rnd) {
    var g = new THREE.Group();
    var clouds = [];

    function makeCloud(x, y, z, s) {
      var c = new THREE.Group();
      c.position.set(x, y, z);
      var parts = [
        [0, 0, 0, 1.6], [1.4, -0.2, 0.2, 1.15], [-1.4, -0.25, -0.2, 1.0],
        [0.7, 0.5, -0.3, 1.05], [-0.8, 0.4, 0.3, 0.95]
      ];
      parts.forEach(function (p) {
        var m = mk('sphere', MAT.cloud, p[0] * s, p[1] * s, p[2] * s,
          p[3] * s, p[3] * 0.72 * s, p[3] * s);
        m.castShadow = false;
        c.add(m);
      });
      c.userData = { speed: 0.35 + rnd() * 0.4, offset: rnd() * 100 };
      return c;
    }

    // 云朵散布到整张地图（含外围），孩子走到哪都有云看
    var spots = [
      [-20, 15, -30, 1.6], [10, 18, -36, 2.0], [28, 14, -20, 1.4],
      [-34, 16, 2, 1.8], [2, 20, 18, 1.7], [-6, 13, 36, 1.5],
      [22, 16, 30, 1.6], [-28, 14, 30, 1.3],
      // 外围高空
      [46, 22, -34, 2.2], [-50, 20, 30, 2.0], [38, 24, 44, 1.9],
      [-44, 21, -48, 2.1], [12, 26, -58, 2.3], [-16, 23, 56, 2.0],
      [58, 19, 8, 1.8], [-62, 18, -12, 1.9]
    ];
    spots.forEach(function (s) {
      var c = makeCloud(s[0], s[1], s[2], s[3]);
      g.add(c);
      clouds.push(c);
    });

    api.group.add(g);
    api.clouds = clouds;
  }

  /* ---------- 8. 蘑菇 ---------- */
  function buildMushrooms(api, rnd) {
    var g = new THREE.Group();
    var capMats = [MAT.red, MAT.pink, MAT.orange, MAT.purple];

    for (var i = 0; i < 14; i++) {
      var a = rnd() * Math.PI * 2;
      var r = 6 + rnd() * (api.radius - 12);
      var m = new THREE.Group();
      m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      var s = 0.7 + rnd() * 0.7;

      m.add(mk('cylLo', MAT.cream, 0, 0.5 * s, 0, 0.3 * s, 1.0 * s, 0.3 * s));
      var cap = mk('sphereLo', capMats[i % 4], 0, 1.0 * s, 0, 0.85 * s, 0.5 * s, 0.85 * s);
      m.add(cap);
      // 菌盖上的白点
      m.add(mk('sphereLo', MAT.white, 0.2 * s, 1.35 * s, 0.15 * s, 0.13, 0.08, 0.13));
      m.add(mk('sphereLo', MAT.white, -0.25 * s, 1.3 * s, -0.1 * s, 0.11, 0.07, 0.11));

      g.add(m);
    }
    api.group.add(g);
  }

  /* ---------- 9. 气球（几组飘着的） ---------- */
  function buildBalloons(api, rnd) {
    var g = new THREE.Group();
    var balloons = [];
    var spots = [
      [-12, 26], [14, -18], [30, 6], [-24, -12],
      // 外围的气球：远处也能看到彩色小点
      [40, -34], [-44, 26], [26, 46], [-34, -44],
      [56, 18], [-58, -8]
    ];
    var bmats = [MAT.pink, MAT.blue, MAT.yellow, MAT.purple, MAT.mint];

    spots.forEach(function (p, i) {
      var b = new THREE.Group();
      b.position.set(p[0], 0, p[1]);
      // 一根绳子串 3 个气球
      for (var k = 0; k < 3; k++) {
        var holder = new THREE.Group();
        holder.position.set((k - 1) * 0.85, 0, 0);
        var body = mk('sphere', bmats[(i + k) % 5], 0, 4.2 + k * 0.9, 0, 0.62, 0.75, 0.62);
        holder.add(body);
        // 气球小尖
        holder.add(mk('coneLo', bmats[(i + k) % 5], 0, 3.55 + k * 0.9, 0, 0.16, 0.3, 0.16));
        // 绳子
        holder.add(mk('cylLo', MAT.white, 0, 1.9 + k * 0.45, 0, 0.03, 3.4 - k * 0.9, 0.03));
        holder.userData = { phase: k * 1.3 + i, baseY: 0 };
        b.add(holder);
        balloons.push(holder);
      }
      // 地面上的小石头压住绳子
      b.add(mk('sphereLo', MAT.gray, 0, 0.2, 0, 0.5, 0.3, 0.5));
      g.add(b);
    });

    api.group.add(g);
    api.balloons = balloons;
  }

  /* ---------- 10. 探索区：中环以外的新景物 ----------
   *
   * 设计目的：地图从 46 扩到 82 后，如果只是把草坪放大，
   * 中间会变成一片空旷的绿色，孩子走几步就没东西看了。
   * 这里在 32 半径以外补上可辨识的地标，让孩子有"往那边走走看"的冲动。
   * 全部是纯装饰，不影响任何任务判定，也不会挡住孩子走路。
   * ------------------------------------------------ */
  function buildExploration(api, rnd) {
    var g = new THREE.Group();
    var inner = api.coreRadius + 6;   // 从核心区外开始铺
    var outer = api.radius - 8;       // 留出边界树墙的位置

    /* ---- 1. 环形小路：连接各分区，给孩子"路"的引导 ----
     * 环的半径按"绝对距离"排布，不按 coreRadius 的倍数 ——
     * 否则地图一大，小路会挤在中心区旁边，把主活动区框得太死。
     * 现在三条环分别落在 30 / 46 / 64，正好在核心区外、中环、外环。
     */
    var pathMat = new THREE.MeshLambertMaterial({ color: 0xf0dcb8 });
    [30, 46, 64].forEach(function (pr) {
      if (pr > outer) return;
      var ring = new THREE.Mesh(new THREE.RingGeometry(pr - 1.1, pr + 1.1, 72), pathMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.025;
      ring.receiveShadow = true;
      g.add(ring);
    });
    // 从中心通向彩虹门的直线小路
    var spoke = new THREE.Mesh(new THREE.PlaneGeometry(4.2, api.coreRadius + 4), pathMat);
    spoke.rotation.x = -Math.PI / 2;
    spoke.position.set(0, 0.028, -(api.coreRadius + 4) / 2 + 2);
    spoke.receiveShadow = true;
    g.add(spoke);

    /* ---- 1b. 中心区补充景物 ----
     * 环形小路外移后，核心活动区（半径 32 以内）会显得有点空。
     * 在这里补一些矮小的、不挡视线的东西：花丛、圆石、长椅、蘑菇。
     * 高度都控制在 1.2 以下，不影响孩子看向远处。
     */
    var centerSpots = [
      // 花丛（几簇，颜色不同）
      { x: -8, z: 16, t: 'flowers', c: 0 }, { x: 16, z: 12, t: 'flowers', c: 1 },
      { x: -20, z: -2, t: 'flowers', c: 2 }, { x: 22, z: -4, t: 'flowers', c: 3 },
      { x: 2, z: 24, t: 'flowers', c: 4 }, { x: -26, z: 12, t: 'flowers', c: 1 },
      // 圆石群
      { x: -16, z: 26, t: 'rocks' }, { x: 26, z: 18, t: 'rocks' },
      { x: -28, z: -8, t: 'rocks' }, { x: 12, z: -24, t: 'rocks' },
      // 蘑菇
      { x: 6, z: 18, t: 'shroom' }, { x: -22, z: 4, t: 'shroom' },
      { x: 24, z: -14, t: 'shroom' },
      // 长椅（孩子可以走过去看）
      { x: -4, z: -12, t: 'bench' }, { x: 18, z: 22, t: 'bench' }
    ];
    centerSpots.forEach(function (s) {
      if (s.t === 'flowers') g.add(smallFlowerPatch(s.x, s.z, s.c));
      else if (s.t === 'rocks') g.add(rockCluster(s.x, s.z, rnd));
      else if (s.t === 'shroom') g.add(mushroomMesh(s.x, s.z, 1.1, 0));
      else if (s.t === 'bench') g.add(smallBench(s.x, s.z));
    });

    /* ---- 2. 糖果树丛：外围的主要"树林"，形成可绕行的绿墙 ---- */
    for (var i = 0; i < 26; i++) {
      var a = (i / 26) * Math.PI * 2 + rnd() * 0.2;
      var r = inner + 6 + rnd() * (outer - inner - 6);
      var x = Math.cos(a) * r, z = Math.sin(a) * r;
      // 别挡在孩子常走的路上
      if (Math.abs(x) < 4 && z < 0 && z > -api.coreRadius) continue;
      g.add(candyTreeMesh(x, z, 0.9 + rnd() * 0.6, Math.floor(rnd() * 7), rnd));
    }

    /* ---- 3. 普通圆球树：和糖果树交错，形成混合林 ---- */
    for (var t = 0; t < 20; t++) {
      var at = rnd() * Math.PI * 2;
      var rt = inner + 2 + rnd() * (outer - inner - 2);
      g.add(normalTreeMesh(
        Math.cos(at) * rt, Math.sin(at) * rt, 1.0 + rnd() * 0.7, rnd
      ));
    }

    /* ---- 4. 三座凉亭：探索区的"目的地"，远远就能看见 ---- */
    var pavilions = [
      { a: 0.7, r: inner + 10 },
      { a: 2.8, r: inner + 18 },
      { a: 4.9, r: inner + 14 }
    ];
    pavilions.forEach(function (p, i) {
      g.add(buildPavilion(
        Math.cos(p.a) * p.r, Math.sin(p.a) * p.r, i
      ));
    });

    /* ---- 5. 彩虹秋千：外围的一处小游乐设施 ---- */
    g.add(buildSwing(inner + 12, -inner - 6));

    /* ---- 6. 散落的圆石与小花丛：填充空隙，避免大面积空地 ---- */
    for (var f = 0; f < 40; f++) {
      var af = rnd() * Math.PI * 2;
      var rf = inner + rnd() * (outer - inner);
      var fx = Math.cos(af) * rf, fz = Math.sin(af) * rf;
      if (rnd() < 0.55) {
        // 小石子
        var rock = mk('sphereLo', MAT.gray, fx, 0.16, fz,
          0.4 + rnd() * 0.5, 0.3 + rnd() * 0.3, 0.4 + rnd() * 0.5);
        rock.rotation.y = rnd() * Math.PI;
        g.add(rock);
      } else {
        // 三朵一簇的小花
        var cluster = new THREE.Group();
        cluster.position.set(fx, 0, fz);
        for (var c = 0; c < 3; c++) {
          var cm = [MAT.flowerWht, MAT.flowerYel, MAT.flowerPur][c];
          var st = mk('cylLo', MAT.leaf, 0, 0.2, 0, 0.05, 0.4, 0.05);
          cluster.add(st);
          var pf = mk('sphereLo', cm, 0, 0.44, 0, 0.18, 0.1, 0.18);
          cluster.add(pf);
        }
        var sc = 0.8 + rnd() * 0.6;
        cluster.scale.setScalar(sc);
        g.add(cluster);
      }
    }

    /* ---- 7. 外围的蘑菇圈：呼应中心的蘑菇，形成"越深越奇幻" ---- */
    for (var m = 0; m < 16; m++) {
      var am = rnd() * Math.PI * 2;
      var rm = inner + 4 + rnd() * (outer - inner - 4);
      g.add(mushroomMesh(
        Math.cos(am) * rm, Math.sin(am) * rm,
        0.8 + rnd() * 0.7, Math.floor(rnd() * 4)
      ));
    }

    api.group.add(g);
    api.explore = g;
  }

  /**
   * 性能优化：远处的景物关闭阴影投射
   *
   * 为什么需要：地图从 46 扩到 82 后，景物数量翻倍，
   * draw calls 从 370 涨到 860 多。低端平板/手机会掉到 30 帧以下。
   *
   * 关键点：距离玩家 55 单位以外的景物，孩子根本看不清细节，
   * 但它们仍在参与阴影计算，白白消耗性能。
   * 关闭后视觉上几乎无差别（远处阴影本来就看不清），但省下大量开销。
   *
   * 注意：只对"探索区"生效，不动中心区的任务相关景物，
   * 避免影响交互物和任务的视觉表现。
   *
   * @param {number} maxDist 超过这个距离就关阴影
   * @param {THREE.Vector3} playerPos 玩家位置
   */
  function cullShadowsByDistance(group, maxDist, playerPos) {
    if (!group) return;
    var maxSq = maxDist * maxDist;
    group.traverse(function (o) {
      if (!o.isMesh) return;
      // 复用临时 Vector3，避免每帧 new 造成 GC
      if (!o.userData._wp) o.userData._wp = new THREE.Vector3();
      o.getWorldPosition(o.userData._wp);
      var dSq = o.userData._wp.distanceToSquared(playerPos);
      o.castShadow = dSq < maxSq;
    });
  }

  /* ---------- 探索区零件：糖果树 / 普通树 / 凉亭 / 秋千 / 蘑菇 ---------- */

  /** 矮小的花丛（中心区用，不挡视线） */
  function smallFlowerPatch(x, z, colorIdx) {
    var g = new THREE.Group();
    g.position.set(x, 0, z);
    var m = [MAT.flowerRed, MAT.flowerYel, MAT.flowerBlu, MAT.flowerPur, MAT.flowerWht][colorIdx % 5];
    for (var i = 0; i < 5; i++) {
      var a = (i / 5) * Math.PI * 2;
      var r = 0.5 + (i % 2) * 0.35;
      var st = mk('cylLo', MAT.leaf, Math.cos(a) * r, 0.24, Math.sin(a) * r, 0.05, 0.48, 0.05);
      g.add(st);
      var fm = mk('sphereLo', m, Math.cos(a) * r, 0.5, Math.sin(a) * r, 0.22, 0.11, 0.22);
      g.add(fm);
    }
    return g;
  }

  /** 圆石群 */
  function rockCluster(x, z, rnd) {
    var g = new THREE.Group();
    g.position.set(x, 0, z);
    for (var i = 0; i < 4; i++) {
      var a = rnd() * Math.PI * 2;
      var r = rnd() * 1.6;
      var s = 0.4 + rnd() * 0.55;
      var rock = mk('sphereLo', i % 2 ? MAT.gray : MAT.cream,
        Math.cos(a) * r, s * 0.35, Math.sin(a) * r, s, s * 0.7, s);
      rock.rotation.y = rnd() * Math.PI;
      g.add(rock);
    }
    return g;
  }

  /** 矮长椅 */
  function smallBench(x, z) {
    var g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rndStatic(x, z);      // 同一个位置每次朝向一致
    // 座面
    g.add(mk('box', MAT.wood, 0, 0.5, 0, 2.6, 0.16, 0.9));
    // 靠背
    g.add(mk('box', MAT.woodDark, 0, 0.95, -0.4, 2.6, 0.8, 0.14));
    // 腿
    [-1.0, 1.0].forEach(function (lx) {
      g.add(mk('box', MAT.woodDark, lx, 0.24, 0, 0.2, 0.48, 0.8));
    });
    return g;
  }

  /** 用坐标推一个稳定的朝向（保证同一个长椅每次生成角度一样） */
  function rndStatic(x, z) {
    var s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return (s - Math.floor(s)) * Math.PI * 2;
  }

  /** 糖果树（可复用的独立版本） */
  function candyTreeMesh(x, z, s, colorIdx, rnd) {
    var t = new THREE.Group();
    t.position.set(x, 0, z);
    t.add(mk('cylLo', MAT.white, 0, 1.8 * s, 0, 0.3 * s, 3.6 * s, 0.3 * s));
    var top = mk('sphere', MAT.rainbow[colorIdx % 7], 0, 4.2 * s, 0,
      1.7 * s, 1.7 * s, 0.55 * s);
    t.add(top);
    var stripes = rnd ? 4 : 5;
    for (var i = 0; i < stripes; i++) {
      var st = mk('torus', MAT.rainbow[(i + colorIdx) % 7],
        0, 0.7 + i * 0.65 * s, 0, 0.42 * s, 0.42 * s, 0.42 * s);
      st.rotation.x = Math.PI / 2;
      t.add(st);
    }
    return t;
  }

  /** 普通圆球树 */
  function normalTreeMesh(x, z, s, rnd) {
    var t = new THREE.Group();
    t.position.set(x, 0, z);
    var h = 2.2 * s;
    t.add(mk('cylLo', MAT.bark, 0, h / 2, 0, 0.35 * s, h, 0.35 * s));
    t.add(mk('sphere', MAT.leaf, 0, h + 0.9 * s, 0, 1.9 * s, 1.7 * s, 1.9 * s));
    t.add(mk('sphere', MAT.leaf2, 0.8 * s, h + 0.2 * s, 0.5 * s, 1.3 * s, 1.2 * s, 1.3 * s));
    t.add(mk('sphere', MAT.leaf, -0.7 * s, h + 0.3 * s, -0.5 * s, 1.2 * s, 1.1 * s, 1.2 * s));
    if (rnd && rnd() < 0.6) {
      t.add(mk('sphereLo', MAT.red, 0.5 * s, h + 1.4 * s, 0.9 * s, 0.2, 0.2, 0.2));
    }
    return t;
  }

  /** 蘑菇 */
  function mushroomMesh(x, z, s, capIdx) {
    var m = new THREE.Group();
    m.position.set(x, 0, z);
    var capMats = [MAT.red, MAT.pink, MAT.orange, MAT.purple];
    m.add(mk('cylLo', MAT.cream, 0, 0.5 * s, 0, 0.3 * s, 1.0 * s, 0.3 * s));
    m.add(mk('sphereLo', capMats[capIdx % 4], 0, 1.0 * s, 0,
      0.85 * s, 0.5 * s, 0.85 * s));
    m.add(mk('sphereLo', MAT.white, 0.2 * s, 1.35 * s, 0.15 * s, 0.13, 0.08, 0.13));
    m.add(mk('sphereLo', MAT.white, -0.25 * s, 1.3 * s, -0.1 * s, 0.11, 0.07, 0.11));
    return m;
  }

  /** 凉亭：探索区的地标建筑 */
  function buildPavilion(x, z, variant) {
    var g = new THREE.Group();
    g.position.set(x, 0, z);

    // 地台
    var deck = mk('cyl', MAT.cream, 0, 0.25, 0, 4.2, 0.5, 4.2);
    g.add(deck);
    var step = mk('cyl', MAT.gray, 0, 0.1, 4.4, 1.6, 0.2, 1.0);
    g.add(step);

    // 六根柱子
    var roofMats = [MAT.pink, MAT.purple, MAT.mint];
    for (var i = 0; i < 6; i++) {
      var pa = (i / 6) * Math.PI * 2;
      var post = mk('cylLo', MAT.white,
        Math.cos(pa) * 3.4, 1.9, Math.sin(pa) * 3.4, 0.22, 3.2, 0.22);
      g.add(post);
    }

    // 圆锥屋顶 + 顶饰
    var roof = mk('cone', roofMats[variant % 3], 0, 4.3, 0, 4.6, 2.2, 4.6);
    g.add(roof);
    g.add(mk('sphereLo', MAT.glowGold, 0, 5.5, 0, 0.34, 0.34, 0.34));
    // 屋檐小灯
    for (var k = 0; k < 6; k++) {
      var ka = (k / 6) * Math.PI * 2;
      g.add(mk('sphereLo', MAT.glowWhite,
        Math.cos(ka) * 3.9, 3.4, Math.sin(ka) * 3.9, 0.18, 0.18, 0.18));
    }

    // 亭子里的长凳
    var bench = mk('box', MAT.wood, 0, 0.85, -2.2, 3.2, 0.3, 0.8);
    g.add(bench);
    g.add(mk('box', MAT.woodDark, 0, 1.2, -2.6, 3.2, 0.6, 0.2));

    return g;
  }

  /** 彩虹秋千 */
  function buildSwing(x, z) {
    var g = new THREE.Group();
    g.position.set(x, 0, z);

    // A 字支架
    [-1.5, 1.5].forEach(function (sx) {
      [-1, 1].forEach(function (sz) {
        var leg = mk('cylLo', MAT.wood, sx * sz, 1.8, 0, 0.2, 3.8, 0.2);
        leg.rotation.z = -sx * sz * 0.24;
        g.add(leg);
      });
    });
    // 横梁
    var bar = mk('cylLo', MAT.woodDark, 0, 3.7, 0, 0.22, 4.2, 0.22);
    bar.rotation.z = Math.PI / 2;
    g.add(bar);

    // 两条吊绳 + 彩虹色座板
    [-0.7, 0.7].forEach(function (sx) {
      var rope = mk('cylLo', MAT.white, sx, 2.7, 0, 0.05, 1.9, 0.05);
      g.add(rope);
    });
    var rc = [0xff8fa8, 0xffd08a, 0xfff09a, 0x9ee8a8, 0x9ed4ff];
    for (var i = 0; i < 5; i++) {
      g.add(mk('box', new THREE.MeshLambertMaterial({ color: rc[i] }),
        0, 1.75, -0.6 + i * 0.3, 1.6, 0.16, 0.26));
    }

    return g;
  }

  /* ---------- 11. 边界：一圈树墙（自然阻挡，孩子不会走到外面） ---------- */
  function buildBoundary(api, rnd) {
    var g = new THREE.Group();
    // 半径变大后，树墙要更密，否则孩子会"看见外面"
    var count = 72;
    for (var i = 0; i < count; i++) {
      var a = (i / count) * Math.PI * 2;
      var r = api.radius + 3;
      var x = Math.cos(a) * r, z = Math.sin(a) * r;

      var t = new THREE.Group();
      t.position.set(x, 0, z);
      // 灌木（两层，遮挡得更严实）
      t.add(mk('sphere', MAT.leaf, 0, 1.6, 0, 3.0, 2.4, 3.0));
      t.add(mk('sphere', MAT.leaf2, 1.6, 1.1, 0.8, 1.9, 1.6, 1.9));
      t.add(mk('sphere', MAT.leaf, -1.5, 1.0, -0.9, 1.7, 1.5, 1.7));
      // 顶上开小花
      if (i % 3 === 0) {
        t.add(mk('sphereLo', MAT.flowerPur, 0, 3.6, 0, 0.5, 0.34, 0.5));
        t.add(mk('sphereLo', MAT.glowGold, 0, 3.9, 0, 0.18, 0.16, 0.18));
      }
      g.add(t);
    }
    api.group.add(g);
  }

  /* ---------- 11. 天空彩虹（集齐 5 颗星星后出现） ---------- */
  function buildRainbowSky(api) {
    var g = new THREE.Group();
    g.position.set(0, 0, -10);
    g.visible = false;         // 默认隐藏
    g.scale.setScalar(0.001); // 初始极小，做出现动画

    for (var i = 0; i < 7; i++) {
      var r = 26 - i * 1.5;
      var arc = new THREE.Mesh(
        new THREE.TorusGeometry(r, 1.05, 10, 48, Math.PI),
        MAT.rainbow[i]
      );
      arc.position.y = -3;
      arc.rotation.y = Math.PI / 2;   // 立起来，像真的彩虹
      g.add(arc);
    }

    // 两端的水滴云
    [-28, 28].forEach(function (x) {
      var c = new THREE.Group();
      c.position.set(x, 0, 0);
      c.add(mk('sphere', MAT.cloud, 0, 0, 0, 3.4, 2.2, 3.4));
      c.add(mk('sphere', MAT.cloud, 2.2, -0.6, 0.4, 2.2, 1.6, 2.2));
      c.add(mk('sphere', MAT.cloud, -2.2, -0.6, -0.4, 2.2, 1.6, 2.2));
      g.add(c);
    });

    api.group.add(g);
    api.bigRainbow = g;
  }

  /* ===========================================================
   * 对外：世界管理器
   * =========================================================== */
  var World = {
    scene: null,
    renderer: null,
    camera: null,
    garden: null,
    cfg: null,
    time: 0,

    /**
     * 初始化场景、光照、地形
     * @param {THREE.WebGLRenderer} renderer
     * @param {string} mapId 地图 id
     */
    init: function (renderer, mapId) {
      this.renderer = renderer;
      var cfg = global.DDLevels.get(mapId) || global.DDLevels.get('rainbow_garden');
      this.cfg = cfg;

      initAssets();

      // ---------- 场景 ----------
      var scene = new THREE.Scene();
      scene.background = new THREE.Color(cfg.sky);
      // 柔和雾效：远处淡入天空色，不会有硬边。
      // 地图放大到 82 之后，雾的近/远平面必须跟着推远，
      // 否则孩子走到中环就"白茫茫一片"，会误以为走错了。
      scene.fog = new THREE.Fog(cfg.fog, 95, 260);
      this.scene = scene;

      // ---------- 摄像机 ----------
      // 远裁剪面要够大：地图扩到 82 后，地平线上的丘陵在 100 单位外，
      // 原来的 300 也够用，但这里留足余量避免远处被裁掉。
      var camera = new THREE.PerspectiveCamera(
        50, window.innerWidth / window.innerHeight, 0.5, 500
      );
      camera.position.set(0, 16, 30);
      this.camera = camera;

      // ---------- 光照 ----------
      // 环境光：整体明亮柔和，没有阴影死角
      var ambient = new THREE.AmbientLight(0xfff4e8, 0.85);
      scene.add(ambient);

      // 半球光：天空偏蓝、地面偏绿，让物体更有立体感
      var hemi = new THREE.HemisphereLight(0xd8f0ff, 0xa8e0a0, 0.5);
      scene.add(hemi);

      // 主平行光：投射柔和阴影
      var dir = new THREE.DirectionalLight(0xfff6e0, 1.05);
      dir.position.set(24, 40, 18);
      dir.castShadow = true;
      dir.shadow.mapSize.width = 1024;
      dir.shadow.mapSize.height = 1024;
      // 阴影范围只覆盖角色周围一小圈，由 updateShadowFollow 跟着玩家平移。
      // 为什么不能直接放大到覆盖整张地图（±82）：
      // 1024 的阴影贴图摊到 164 单位，每单位只剩 6 像素，影子会糊成一团。
      // 缩小范围反而能保证孩子身边的影子清晰锐利。
      dir.shadow.camera.left = -30;
      dir.shadow.camera.right = 30;
      dir.shadow.camera.top = 30;
      dir.shadow.camera.bottom = -30;
      dir.shadow.camera.near = 1;
      dir.shadow.camera.far = 160;
      dir.shadow.bias = -0.0008;
      dir.shadow.normalBias = 0.02;
      scene.add(dir);
      scene.add(dir.target);
      this.sun = dir;

      // ---------- 地图 ----------
      this.garden = RainbowGarden(scene, cfg);

      return { scene: scene, camera: camera, garden: this.garden };
    },

    /**
     * 让阴影相机跟着玩家走
     *
     * 地图放大后必须这样做：阴影相机是固定在原点的，
     * 孩子走到 50 单位外就会突然"影子消失"，非常突兀。
     *
     * @param {THREE.Vector3} pos 玩家位置
     */
    updateShadowFollow: function (pos) {
      var dir = this.sun;
      if (!dir || !pos) return;
      // 记录玩家位置，供 update() 里的远景阴影剔除使用
      this._focusPos = pos;
      // 保持光线方向不变，只平移光源和目标
      dir.target.position.set(pos.x, 0, pos.z);
      dir.position.set(pos.x + 24, 40, pos.z + 18);
      dir.target.updateMatrixWorld();
    },

    /**
     * 每帧更新：云飘、花摇、气球升、水波、彩虹门转
     */
    update: function (dt) {
      this.time += dt;
      var t = this.time;
      var g = this.garden;
      if (!g) return;

      // 远景阴影剔除：每 0.6 秒做一次即可，不需要每帧遍历。
      // 走太频繁反而会因为遍历本身消耗 CPU。
      this._cullTimer = (this._cullTimer || 0) + dt;
      if (this._cullTimer > 0.6 && this._focusPos && g.explore) {
        this._cullTimer = 0;
        cullShadowsByDistance(g.explore, 55, this._focusPos);
      }

      // 云朵水平飘动，飘到最右边就绕回左边
      // 范围要覆盖整张地图（82 半径 + 云自身尺寸），
      // 否则外围的云会飘出可视区突然消失。
      if (g.clouds) {
        for (var i = 0; i < g.clouds.length; i++) {
          var c = g.clouds[i];
          c.position.x += c.userData.speed * dt;
          if (c.position.x > 110) c.position.x = -110;
        }
      }

      // 花朵轻轻摇摆
      if (g.flowers) {
        for (var f = 0; f < g.flowers.length; f++) {
          var fl = g.flowers[f];
          var ph = fl.userData.phase;
          fl.rotation.z = Math.sin(t * 1.5 + ph) * 0.07;
        }
      }

      // 气球上下浮动 + 轻轻转
      if (g.balloons) {
        for (var b = 0; b < g.balloons.length; b++) {
          var bl = g.balloons[b];
          bl.position.y = Math.sin(t * 1.1 + bl.userData.phase) * 0.32;
          bl.rotation.z = Math.sin(t * 0.9 + bl.userData.phase) * 0.09;
        }
      }

      // 水面波纹扩散
      if (g.waterRings) {
        for (var r = 0; r < g.waterRings.length; r++) {
          var ring = g.waterRings[r];
          var s = 1 + ((t * 0.5 + r * 0.33) % 1) * 0.35;
          ring.scale.set(s, s, 1);
        }
      }

      // 彩虹门上的花缓慢旋转
      if (g.gateFlower) {
        g.gateFlower.rotation.y = t * 0.5;
      }

      // 巨大彩虹出现后缓慢旋转
      if (g.bigRainbow && g.bigRainbow.visible) {
        g.bigRainbow.rotation.y = Math.sin(t * 0.2) * 0.4;
      }
    },

    /**
     * 让某个位置"高亮"（任务目标用）：返回一个外圈光环
     */
    makeHalo: function (colorHex) {
      var m = new THREE.MeshLambertMaterial({
        color: colorHex, emissive: colorHex, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.75
      });
      var ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.45, 28), m);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.09;
      return ring;
    }
  };

  global.DDWorld = World;
})(window);
