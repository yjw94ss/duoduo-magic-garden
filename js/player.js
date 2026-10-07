/* ===========================================================
 * player.js —— 主角（4 岁小女孩）+ 第三人称摄像机
 *
 * 关键设计（面向 4 岁儿童）：
 *  - 没有摇杆、没有键盘。点哪里就自动走过去
 *  - 不能掉进水、不能掉下悬崖、不能出地图、不能迷路
 *  - 走不通时自动沿墙"滑动"，永远不会被卡住
 *  - 走路有身体上下起伏 + 摆腿的动画
 * =========================================================== */
(function (global) {
  'use strict';

  var THREE = global.THREE;

  /* ---------- 角色外观配置（4 种可选角色） ---------- */
  var OUTFITS = {
    princess: {
      name: '彩虹公主',
      dress:  0xffb3d1,   // 粉色裙子
      trim:   0xfff0f6,
      hair:   0x8a5a3b,   // 棕色头发
      skin:   0xffe0c8,
      shoe:   0xff8fb8,
      hat:    'crown',    // 皇冠
      extra:  'rainbow_skirt'   // 彩虹渐层裙摆
    },
    cat: {
      name: '小猫魔法师',
      dress:  0xb79cff,   // 紫色袍子
      trim:   0xefe4ff,
      hair:   0x4a3a5c,
      skin:   0xffe4cc,
      shoe:   0x8a6fd0,
      hat:    'cat_ears',
      extra:  'wand'      // 手持星星魔法棒
    },
    fairy: {
      name: '星星小精灵',
      dress:  0x9be0ff,   // 浅蓝裙子
      trim:   0xeafaff,
      hair:   0xffd98a,   // 浅金发
      skin:   0xffe8d4,
      shoe:   0x7cc4f0,
      hat:    'star',     // 星星发夹
      extra:  'wings'     // 透明小翅膀
    },
    unicorn: {
      name: '独角兽骑士',
      dress:  0xdcd0ff,   // 淡紫骑士服
      trim:   0xffffff,
      hair:   0xffe4f0,
      skin:   0xffe8d4,
      shoe:   0xa89ae8,
      hat:    'unicorn_horn',
      extra:  'cape'      // 小披风
    }
  };

  /* ===========================================================
   * 主角模型构建
   * =========================================================== */
  function buildGirl(outfitKey) {
    var o = OUTFITS[outfitKey] || OUTFITS.princess;

    var matDress = new THREE.MeshLambertMaterial({ color: o.dress });
    var matTrim  = new THREE.MeshLambertMaterial({ color: o.trim });
    var matHair  = new THREE.MeshLambertMaterial({ color: o.hair });
    var matSkin  = new THREE.MeshLambertMaterial({ color: o.skin });
    var matShoe  = new THREE.MeshLambertMaterial({ color: o.shoe });
    var matWhite = new THREE.MeshLambertMaterial({ color: 0xfffdf6 });

    var root = new THREE.Group();      // 整体（控制朝向）
    var body = new THREE.Group();      // 身体（控制走路起伏）
    root.add(body);

    var headG = new THREE.Group();     // 头（控制歪头/开心动作）
    headG.position.y = 1.72;
    body.add(headG);

    /* ---------- 头（大头小身是重点） ---------- */
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 22, 18), matSkin);
    head.scale.set(1, 0.96, 0.94);
    head.castShadow = true;
    headG.add(head);

    // 头发：后脑一整块 + 刘海 + 两侧
    var hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.65, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), matHair);
    hairBack.position.y = 0.06;
    hairBack.scale.set(1.02, 1.0, 1.02);
    headG.add(hairBack);

    var bangs = new THREE.Mesh(new THREE.SphereGeometry(0.6, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), matHair);
    bangs.position.set(0, 0.14, 0.12);
    bangs.scale.set(1.05, 0.72, 0.95);
    headG.add(bangs);

    // 两侧小发辫
    [-0.6, 0.6].forEach(function (x) {
      var tail = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), matHair);
      tail.position.set(x, -0.32, -0.05);
      tail.scale.set(0.8, 1.9, 0.8);
      headG.add(tail);
      var tie = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), matTrim);
      tie.position.set(x, -0.12, -0.05);
      headG.add(tie);
    });

    // 眼睛：大大的黑葡萄 + 白色高光 + 睫毛
    [-0.24, 0.24].forEach(function (x) {
      var eye = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12),
        new THREE.MeshLambertMaterial({ color: 0x3a2b33 }));
      eye.position.set(x, 0.02, 0.55);
      headG.add(eye);

      var hi = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), matWhite);
      hi.position.set(x + 0.04, 0.06, 0.65);
      headG.add(hi);

      var lash = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.045, 0.05), matHair);
      lash.position.set(x, 0.14, 0.58);
      lash.rotation.z = x > 0 ? -0.3 : 0.3;
      headG.add(lash);
    });

    // 腮红
    [-0.38, 0.38].forEach(function (x) {
      var blush = new THREE.Mesh(new THREE.CircleGeometry(0.1, 14),
        new THREE.MeshLambertMaterial({
          color: 0xffa8bd, transparent: true, opacity: 0.75
        }));
      blush.position.set(x, -0.14, 0.5);
      blush.rotation.y = x > 0 ? 0.35 : -0.35;
      headG.add(blush);
    });

    // 微笑的嘴（一个上扬的弧线，用小扁球拼）
    var smile = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.032, 6, 14, Math.PI), matHair);
    smile.position.set(0, -0.2, 0.58);
    smile.rotation.z = Math.PI;
    headG.add(smile);

    // 鼻子（小点点）
    var nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xffc9b0 }));
    nose.position.set(0, -0.08, 0.62);
    headG.add(nose);

    /* ---------- 头饰 ---------- */
    if (o.hat === 'crown') {
      var crown = new THREE.Group();
      crown.position.y = 0.58;
      var band = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 14),
        new THREE.MeshLambertMaterial({ color: 0xffd75e, emissive: 0xaa7700, emissiveIntensity: 0.3 }));
      crown.add(band);
      for (var ci = 0; ci < 5; ci++) {
        var ang = (ci / 5) * Math.PI * 2;
        var tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 8),
          new THREE.MeshLambertMaterial({ color: 0xffe98a, emissive: 0xaa7700, emissiveIntensity: 0.3 }));
        tip.position.set(Math.cos(ang) * 0.28, 0.2, Math.sin(ang) * 0.28);
        crown.add(tip);
        var gem = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6),
          new THREE.MeshLambertMaterial({ color: [0xff6b8a, 0x6bd8ff, 0xffe36b, 0x8aff9e, 0xc08aff][ci] }));
        gem.position.set(Math.cos(ang) * 0.28, 0.05, Math.sin(ang) * 0.28);
        crown.add(gem);
      }
      headG.add(crown);
    } else if (o.hat === 'cat_ears') {
      [-0.34, 0.34].forEach(function (x) {
        var ear = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.36, 4), matDress);
        ear.position.set(x, 0.56, 0);
        ear.rotation.y = Math.PI / 4;
        headG.add(ear);
        var inner = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.22, 4),
          new THREE.MeshLambertMaterial({ color: 0xffc9dd }));
        inner.position.set(x, 0.54, 0.05);
        inner.rotation.y = Math.PI / 4;
        headG.add(inner);
      });
      // 猫胡子
      [-0.28, 0.28].forEach(function (sx) {
        [0.06, -0.06].forEach(function (dy) {
          var w = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.3), matHair);
          w.position.set(sx, -0.16 + dy, 0.5);
          headG.add(w);
        });
      });
    } else if (o.hat === 'star') {
      var star = new THREE.Mesh(starGeometry(0.26, 0.11, 5),
        new THREE.MeshLambertMaterial({ color: 0xffe36b, emissive: 0xaa8800, emissiveIntensity: 0.5 }));
      star.position.set(0.34, 0.5, 0.24);
      star.rotation.set(-0.3, 0, 0.5);
      headG.add(star);
      var star2 = new THREE.Mesh(starGeometry(0.16, 0.07, 5),
        new THREE.MeshLambertMaterial({ color: 0xfff6c0, emissive: 0xaa8800, emissiveIntensity: 0.4 }));
      star2.position.set(-0.36, 0.46, 0.18);
      star2.rotation.set(0, 0, -0.4);
      headG.add(star2);
    } else if (o.hat === 'unicorn_horn') {
      var horn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.5, 10),
        new THREE.MeshLambertMaterial({ color: 0xfff3c4, emissive: 0x886600, emissiveIntensity: 0.45 }));
      horn.position.set(0, 0.62, 0.28);
      horn.rotation.x = -0.3;
      headG.add(horn);
      // 鬃毛
      for (var mi = 0; mi < 5; mi++) {
        var mh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), matHair);
        mh.position.set(0, 0.5 - mi * 0.02, -0.5 - mi * 0.06);
        mh.scale.set(1, 0.7, 0.7);
        headG.add(mh);
      }
    }

    /* ---------- 身体：裙子 ---------- */
    var dress = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.72, 1.0, 20), matDress);
    dress.position.y = 1.02;
    dress.castShadow = true;
    body.add(dress);

    // 裙摆镶边
    var hem = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.76, 0.16, 20), matTrim);
    hem.position.y = 0.55;
    body.add(hem);

    // 彩虹渐层（公主专属裙子花纹）
    if (o.extra === 'rainbow_skirt') {
      var rcols = [0xff9ec7, 0xffd08a, 0xfff09a, 0x9ee8a8, 0x9ed4ff];
      for (var ri = 0; ri < 5; ri++) {
        var band2 = new THREE.Mesh(
          new THREE.CylinderGeometry(0.74 - ri * 0.008, 0.755 - ri * 0.008, 0.1, 20),
          new THREE.MeshLambertMaterial({ color: rcols[ri] })
        );
        band2.position.y = 0.66 + ri * 0.1;
        body.add(band2);
      }
    }

    // 腰
    var belt = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.1, 20), matTrim);
    belt.position.y = 1.5;
    body.add(belt);

    // 上身（小小的一点）
    var torso = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 14), matDress);
    torso.position.y = 1.6;
    torso.scale.set(1, 0.7, 0.8);
    body.add(torso);

    // 泡泡袖
    [-0.42, 0.42].forEach(function (x) {
      var puff = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), matTrim);
      puff.position.set(x, 1.62, 0);
      body.add(puff);
    });

    /* ---------- 手臂 ---------- */
    var arms = [];
    [-1, 1].forEach(function (side) {
      var armG = new THREE.Group();
      armG.position.set(side * 0.42, 1.55, 0);
      var arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.42, 4, 8), matSkin);
      arm.position.y = -0.3;
      arm.castShadow = true;
      armG.add(arm);
      var hand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), matSkin);
      hand.position.y = -0.56;
      armG.add(hand);
      body.add(armG);
      arms.push(armG);
    });

    /* ---------- 腿 + 鞋 ---------- */
    var legs = [];
    [-1, 1].forEach(function (side) {
      var legG = new THREE.Group();
      legG.position.set(side * 0.22, 0.58, 0);
      var leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.3, 4, 8), matSkin);
      leg.position.y = -0.22;
      leg.castShadow = true;
      legG.add(leg);
      var shoe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), matShoe);
      shoe.position.set(0, -0.44, 0.06);
      shoe.scale.set(1, 0.72, 1.35);
      legG.add(shoe);
      body.add(legG);
      legs.push(legG);
    });

    /* ---------- 额外装饰 ---------- */
    if (o.extra === 'wings') {
      var wingMat = new THREE.MeshLambertMaterial({
        color: 0xffffff, transparent: true, opacity: 0.62,
        side: THREE.DoubleSide, emissive: 0xccefff, emissiveIntensity: 0.4
      });
      // 翅膀要"贴着身体两侧展开"，绕 Y 轴转 ±0.5 就够。
      // 如果转到接近 ±π/2（90°），从背后看就变成零厚度的细线 —— 看起来像没有翅膀。
      var wingL = new THREE.Mesh(new THREE.CircleGeometry(0.52, 18), wingMat);
      wingL.position.set(-0.46, 1.72, -0.22);
      wingL.rotation.set(0, -0.5, 0.45);
      var wingR = new THREE.Mesh(new THREE.CircleGeometry(0.52, 18), wingMat);
      wingR.position.set(0.46, 1.72, -0.22);
      wingR.rotation.set(0, 0.5, -0.45);
      body.add(wingL); body.add(wingR);
      root.userData.wings = [wingL, wingR];
    }

    if (o.extra === 'cape') {
      var cape = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.3, 14, 1, true),
        new THREE.MeshLambertMaterial({ color: 0xff9ec7, side: THREE.DoubleSide }));
      cape.position.set(0, 1.2, -0.36);
      cape.rotation.x = 0.16;
      body.add(cape);
      root.userData.cape = cape;
    }

    if (o.extra === 'wand') {
      // 魔法棒：细棍 + 顶部星星（会转）
      var wand = new THREE.Group();
      var stick = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.9, 8), matTrim);
      stick.position.y = 0.35;
      wand.add(stick);
      var wstar = new THREE.Mesh(starGeometry(0.2, 0.09, 5),
        new THREE.MeshLambertMaterial({ color: 0xffe36b, emissive: 0xaa8800, emissiveIntensity: 0.6 }));
      wstar.position.y = 0.88;
      wand.add(wstar);
      wand.position.set(0.55, 0.98, 0.28);
      wand.rotation.z = -0.3;
      body.add(wand);
      root.userData.wandStar = wstar;
    }

    /* ---------- 脚下的影子光环（帮助孩子看清自己在哪） ---------- */
    var shadowRing = new THREE.Mesh(
      new THREE.CircleGeometry(0.62, 20),
      new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.28
      })
    );
    shadowRing.rotation.x = -Math.PI / 2;
    shadowRing.position.y = 0.03;
    root.add(shadowRing);

    root.traverse(function (o2) {
      if (o2.isMesh) { o2.castShadow = true; o2.receiveShadow = false; }
    });

    return {
      root: root, body: body, head: headG,
      arms: arms, legs: legs, shadowRing: shadowRing
    };
  }

  // 小工具：星星几何体
  function starGeometry(outer, inner, points) {
    var shape = new THREE.Shape();
    var step = Math.PI / points;
    for (var i = 0; i < points * 2; i++) {
      var r = (i % 2 === 0) ? outer : inner;
      var a = i * step - Math.PI / 2;
      var px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.12, bevelEnabled: true, bevelSize: 0.03,
      bevelThickness: 0.03, bevelSegments: 1
    });
  }

  /* ===========================================================
   * 主角控制器
   * =========================================================== */
  function Player(scene, camera, garden, outfitKey) {
    this.scene = scene;
    this.camera = camera;
    this.garden = garden;

    var rig = buildGirl(outfitKey);
    this.outfit = OUTFITS[outfitKey] || OUTFITS.princess;
    this.rig = rig;
    scene.add(rig.root);

    this.pos = new THREE.Vector3(0, 0, 14);   // 出生点
    this.target = this.pos.clone();            // 移动目标
    this.faceAngle = Math.PI;                  // 朝向
    this.speed = 7.2;                          // 移动速度（世界单位/秒）
    this.isMoving = false;
    this.walkPhase = 0;
    this.idleTime = 0;

    // 相机跟随状态
    this.camOffset = new THREE.Vector3(0, 15.5, 20);
    this.camTargetOffset = this.camOffset.clone();
    this.camLook = new THREE.Vector3();
    this.camLookTarget = new THREE.Vector3();
    this.zoom = 1;              // 1 = 正常，0.75 = 互动时拉近
    this.zoomTarget = 1;

    this.blocked = false;       // 上次移动是否被阻挡（用于抖动反馈）
    this.jumpT = 0;            // 跳跃动画
    this.groundY = 0;           // 当前离地高度（走桥时抬高）
  }

  Player.prototype.setOutfit = function (key) {
    // 换装：销毁旧模型重新建
    this.scene.remove(this.rig.root);
    disposeTree(this.rig.root);
    var rig = buildGirl(key);
    this.outfit = OUTFITS[key] || OUTFITS.princess;
    this.rig = rig;
    this.scene.add(rig.root);
    this.pos.set(0, 0, 14);
    this.target.copy(this.pos);
  };

  /**
   * 设置移动目标（点地面 / 点目标时调用）
   * @param {number} x
   * @param {number} z
   */
  Player.prototype.moveTo = function (x, z) {
    this.target.set(x, 0, z);
    this.idleTime = 0;
  };

  /**
   * 当前位置
   */
  Player.prototype.getPos = function () {
    return this.pos;
  };

  /**
   * 跳一下（开心 / 拿到奖励）
   */
  Player.prototype.jump = function () {
    this.jumpT = 0.55;
  };

  /**
   * 互动时镜头拉近
   */
  Player.prototype.zoomIn = function () {
    this.zoomTarget = 0.68;
  };
  Player.prototype.zoomOut = function () {
    this.zoomTarget = 1;
  };

  /**
   * 判断某个点是否在木桥上
   * @param {number} x
   * @param {number} z
   * @returns {boolean}
   */
  Player.prototype.onBridge = function (x, z) {
    var g = this.garden;
    if (!g || !g.bridgeArea) return false;
    var b = g.bridgeArea;
    var dx = x - b.x, dz = z - b.z;
    // 桥可能是斜的（rotation.y != 0），
    // 必须把点反向旋转回桥的局部坐标系，否则"看得见桥却走不上去"
    if (b.rotY) {
      var c = Math.cos(-b.rotY), s = Math.sin(-b.rotY);
      var lx = dx * c - dz * s;
      var lz = dx * s + dz * c;
      dx = lx; dz = lz;
    }
    return Math.abs(dx) <= b.hw && Math.abs(dz) <= b.hd;
  };

  /**
   * 计算某点的地面高度（在木桥上会抬高）
   * @param {number} x
   * @param {number} z
   * @returns {number} y 高度
   */
  Player.prototype.groundHeight = function (x, z) {
    return this.onBridge(x, z) ? 0.36 : 0;   // 桥面高度
  };

  /**
   * 判断一个点能不能走（不能掉水里、不能出地图）
   */
  Player.prototype.canWalk = function (x, z) {
    var g = this.garden;
    if (!g) return true;
    var r = g.radius;

    // 1. 不能超出地图半径（树墙）
    var d = Math.sqrt(x * x + z * z);
    if (d > r - 2.6) return false;

    // 2. 不能进池塘（除非在木桥上）
    if (g.waterArea) {
      var dx = x - g.waterArea.x, dz = z - g.waterArea.z;
      if (Math.sqrt(dx * dx + dz * dz) < g.waterArea.r) {
        if (this.onBridge(x, z)) return true;
        return false;
      }
    }

    // 3. 不能穿过小房子
    if (g.housePos) {
      var hx = x - g.housePos.x, hz = z - g.housePos.z;
      if (Math.sqrt(hx * hx + hz * hz) < 4.2) return false;
    }

    return true;
  };

  /**
   * 每帧更新：移动 + 动画 + 相机
   */
  Player.prototype.update = function (dt) {
    var rig = this.rig;

    /* ---------- 1. 移动（带碰撞滑动） ---------- */
    var dx = this.target.x - this.pos.x;
    var dz = this.target.z - this.pos.z;
    var dist = Math.sqrt(dx * dx + dz * dz);

    this.isMoving = false;
    this.blocked = false;

    if (dist > 0.16) {
      var step = Math.min(dist, this.speed * dt);
      var nx = dx / dist, nz = dz / dist;

      // 先尝试正前方
      var tryX = this.pos.x + nx * step;
      var tryZ = this.pos.z + nz * step;

      if (this.canWalk(tryX, tryZ)) {
        this.pos.x = tryX; this.pos.z = tryZ;
        this.isMoving = true;
      } else {
        // 沿墙滑动：只试 X、只试 Z（这样会自然地绕过池塘和房子）
        if (this.canWalk(tryX, this.pos.z)) {
          this.pos.x = tryX;
          this.isMoving = true;
        } else if (this.canWalk(this.pos.x, tryZ)) {
          this.pos.z = tryZ;
          this.isMoving = true;
        } else {
          // 完全走不通：停下来 + 轻轻摇头（不让孩子以为坏了）
          this.blocked = true;
          this.target.copy(this.pos);
        }
      }

      // 到达目标附近就停下
      var newDx = this.target.x - this.pos.x, newDz = this.target.z - this.pos.z;
      if (Math.sqrt(newDx * newDx + newDz * newDz) < 0.18) {
        this.target.copy(this.pos);
        this.isMoving = false;
      }
    }

    /* ---------- 2. 朝向与走路动画 ---------- */
    if (this.isMoving) {
      var want = Math.atan2(dx, dz);
      // 平滑转角度，不会突然转身
      var diff = want - this.faceAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.faceAngle += diff * Math.min(1, dt * 12);

      this.walkPhase += dt * 11;
      var swing = Math.sin(this.walkPhase);
      this.idleTime = 0;

      // 腿一前一后摆
      rig.legs[0].rotation.x = swing * 0.62;
      rig.legs[1].rotation.x = -swing * 0.62;
      // 手臂反相摆动
      rig.arms[0].rotation.x = -swing * 0.5;
      rig.arms[1].rotation.x = swing * 0.5;
      // 身体上下起伏（这是最关键的"活着"的感觉）
      rig.body.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.16;
      // 走路时身体左右晃
      rig.body.rotation.z = swing * 0.05;
      rig.head.rotation.z = -swing * 0.04;

      // 走路音效（内部节流）
      global.DDAudio.footstep();
    } else {
      // 静止：呼吸 + 偶尔眨眼/歪头
      this.walkPhase += dt * 2.2;
      var breathe = Math.sin(this.walkPhase) * 0.04;
      rig.body.position.y = breathe;
      rig.body.rotation.z = 0;
      rig.legs[0].rotation.x *= 0.82;
      rig.legs[1].rotation.x *= 0.82;
      rig.arms[0].rotation.x *= 0.86;
      rig.arms[1].rotation.x *= 0.86;

      // 被挡住时轻轻摇头
      if (this.blocked) {
        rig.head.rotation.z = Math.sin(performance.now() / 90) * 0.14;
      } else {
        rig.head.rotation.z = Math.sin(this.walkPhase * 0.6) * 0.05;
      }
      this.idleTime += dt;
    }

    /* ---------- 3. 跳跃动画（庆祝） ---------- */
    if (this.jumpT > 0) {
      this.jumpT -= dt;
      var jt = 1 - this.jumpT / 0.55;      // 0→1
      rig.body.position.y = Math.sin(jt * Math.PI) * 1.1;
      rig.arms[0].rotation.z = 0.9;
      rig.arms[1].rotation.z = -0.9;
      if (this.jumpT <= 0) {
        rig.arms[0].rotation.z = 0;
        rig.arms[1].rotation.z = 0;
      }
    } else {
      rig.arms[0].rotation.z = 0;
      rig.arms[1].rotation.z = 0;
    }

    /* ---------- 4. 翅膀 / 披风 / 魔法棒的小动画 ---------- */
    if (rig.root.userData.wings) {
      // 绕 Z 轴上下扇动（翅膀是竖着长的，绕 Z 转才是"拍翅膀"）
      var flap = Math.sin(performance.now() / 220) * 0.42;
      rig.root.userData.wings[0].rotation.z = 0.45 + flap;
      rig.root.userData.wings[1].rotation.z = -0.45 - flap;
    }
    if (rig.root.userData.wandStar) {
      rig.root.userData.wandStar.rotation.y += dt * 2.4;
    }
    if (rig.root.userData.cape) {
      rig.root.userData.cape.rotation.x = 0.16 + Math.sin(performance.now() / 400) * 0.1;
    }

    /* ---------- 5. 影子光环随状态变色 ---------- */
    if (rig.shadowRing) {
      rig.shadowRing.material.opacity = this.isMoving ? 0.2 : 0.3;
    }

    /* ---------- 6. 应用位置与朝向 ---------- */
    // 上桥时抬高到桥面高度，避免穿模
    this.groundY += ((this.groundHeight(this.pos.x, this.pos.z)) - this.groundY) * Math.min(1, dt * 8);
    rig.root.position.set(this.pos.x, this.groundY, this.pos.z);
    rig.root.rotation.y = this.faceAngle;

    /* ---------- 7. 第三人称相机（固定高度，不允许旋转） ---------- */
    this.zoom += (this.zoomTarget - this.zoom) * Math.min(1, dt * 3.2);

    // 临时注视点：某些小游戏（如数鸭子）需要镜头看向别处，
    // 结束后自动恢复跟随玩家。
    var lookX = this.pos.x, lookZ = this.pos.z, baseY = this.groundY;
    var followX = this.pos.x, followZ = this.pos.z;
    if (this.focusTarget) {
      lookX = this.focusTarget.x;
      lookZ = this.focusTarget.z;
    }
    if (this.focusMove) {
      // 镜头基点也平移到注视点（配合拉近，形成"特写"效果）
      followX = this.focusTarget ? this.focusTarget.x : followX;
      followZ = this.focusTarget ? this.focusTarget.z : followZ;
    }

    // 相机目标位置：注视点后上方
    var off = this.camTargetOffset;
    var desiredX = followX + off.x;
    var desiredY = baseY + off.y * this.zoom;
    var desiredZ = followZ + off.z * this.zoom;

    // 平滑插值跟随（不跟得太紧，留一点延迟感）
    var k = Math.min(1, dt * 3.6);
    this.camera.position.x += (desiredX - this.camera.position.x) * k;
    this.camera.position.y += (desiredY - this.camera.position.y) * k;
    this.camera.position.z += (desiredZ - this.camera.position.z) * k;

    // 视线看向角色头部稍上方
    this.camLookTarget.set(lookX, baseY + 1.5, lookZ);
    this.camLook.lerp(this.camLookTarget, Math.min(1, dt * 5));
    this.camera.lookAt(this.camLook);
  };

  /**
   * 临时把镜头看向某个位置
   * @param {THREE.Vector3} pos 世界坐标
   * @param {number} zoom 缩放（<1 拉近）
   * @param {number} dur 持续毫秒
   */
  Player.prototype.focusOn = function (pos, zoom, dur) {
    this.focusTarget = pos.clone();
    this.zoomTarget = zoom || 0.7;
    clearTimeout(this._focusTimer);
    var self = this;
    this._focusTimer = setTimeout(function () {
      self.focusTarget = null;
      self.zoomTarget = 1;
    }, dur || 3000);
  };

  /**
   * 恢复镜头跟随玩家
   */
  Player.prototype.focusOff = function () {
    this.focusTarget = null;
    this.zoomTarget = 1;
    clearTimeout(this._focusTimer);
  };

  /**
   * 释放一个对象树的资源
   */
  function disposeTree(obj) {
    obj.traverse(function (o) {
      if (o.geometry && o.geometry.dispose) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(function (m) { m.dispose(); });
        else o.material.dispose();
      }
    });
  }

  global.DDPlayer = Player;
  global.DDPlayerOutfits = OUTFITS;
})(window);
