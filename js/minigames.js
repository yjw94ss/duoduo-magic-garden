/* ===========================================================
 * minigames.js —— 5 个小游戏 + 特效系统 + 任务管理器
 *
 * 儿童向铁律（贯穿全部小游戏）：
 *  - 没有失败、没有 Game Over、没有红叉、没有倒计时
 *  - 答错只是"轻轻摇一摇 + 温柔地再说一次"
 *  - 所有选择都是屏幕下半部分的巨大按钮
 *  - 每完成一个给 1 颗魔法星星，集齐 5 颗开宝箱
 * =========================================================== */
(function (global) {
  'use strict';

  var THREE = global.THREE;

  /* ===========================================================
   * 特效系统：星星粒子爆开、收集动画
   * =========================================================== */
  function FXManager(scene) {
    this.scene = scene;
    this.items = [];       // 正在播放的特效
    this.geos = {
      star: makeStarGeo(0.18, 0.08, 5),
      dot: new THREE.SphereGeometry(0.11, 8, 6)
    };
  }

  /** 造一个星形几何体 */
  function makeStarGeo(outer, inner, pts) {
    var shape = new THREE.Shape();
    for (var i = 0; i < pts * 2; i++) {
      var r = (i % 2 === 0) ? outer : inner;
      var a = (i * Math.PI / pts) - Math.PI / 2;
      var x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.08, bevelEnabled: false
    });
  }

  /**
   * 星星爆开特效
   * @param {THREE.Vector3} pos 位置
   * @param {number} count 粒子数
   * @param {number[]} colorArr 颜色数组
   * @param {number} power 力度
   */
  FXManager.prototype.burst = function (pos, count, colorArr, power) {
    count = count || 14;
    power = power || 1;
    var colors = colorArr || [0xffe36b, 0xfff3a0, 0xffd75e, 0xffffff];

    for (var i = 0; i < count; i++) {
      var mat = new THREE.MeshLambertMaterial({
        color: colors[i % colors.length],
        emissive: colors[i % colors.length],
        emissiveIntensity: 0.55,
        transparent: true,
        opacity: 1
      });
      var m = new THREE.Mesh(this.geos.star, mat);
      m.position.copy(pos);
      m.scale.setScalar(0.8 + Math.random() * 0.7);
      this.scene.add(m);

      // 随机方向 + 随机初速
      var a = Math.random() * Math.PI * 2;
      var up = 2.2 + Math.random() * 2.6;
      var sp = 2.4 * power + Math.random() * 2.6 * power;
      this.items.push({
        mesh: m,
        vx: Math.cos(a) * sp,
        vy: up * power,
        vz: Math.sin(a) * sp,
        life: 0.9 + Math.random() * 0.5,
        age: 0,
        spin: (Math.random() - 0.5) * 9
      });
    }
    // 中心一个大光球
    var ball = new THREE.Mesh(this.geos.dot, new THREE.MeshLambertMaterial({
      color: 0xfff6c0, emissive: 0xffdd66, emissiveIntensity: 0.9, transparent: true, opacity: 0.9
    }));
    ball.position.copy(pos);
    this.scene.add(ball);
    this.items.push({
      mesh: ball, vx: 0, vy: 1.4, vz: 0, life: 0.45, age: 0, spin: 0,
      scaleOut: 3.2
    });
  };

  /**
   * 完成时的彩色星星雨（从天上落下来）
   */
  FXManager.prototype.rain = function (centerX, centerZ, count) {
    count = count || 26;
    var colors = [0xff6b8a, 0xffd93d, 0x6bdc7a, 0x4fc3f7, 0xb06bff, 0xff9f43];
    for (var i = 0; i < count; i++) {
      var mat = new THREE.MeshLambertMaterial({
        color: colors[i % colors.length], emissive: colors[i % colors.length],
        emissiveIntensity: 0.5, transparent: true, opacity: 1
      });
      var m = new THREE.Mesh(this.geos.star, mat);
      var a = (i / count) * Math.PI * 2;
      var r = 1.5 + Math.random() * 4.5;
      m.position.set(centerX + Math.cos(a) * r, 12 + Math.random() * 5, centerZ + Math.sin(a) * r);
      m.scale.setScalar(0.7 + Math.random() * 0.8);
      this.scene.add(m);
      this.items.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 0.7,
        vy: -2.4 - Math.random() * 1.6,
        vz: (Math.random() - 0.5) * 0.7,
        life: 2.6, age: 0, spin: (Math.random() - 0.5) * 6
      });
    }
  };

  /**
   * 更新所有粒子
   */
  FXManager.prototype.update = function (dt) {
    for (var i = this.items.length - 1; i >= 0; i--) {
      var p = this.items[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.scene.remove(p.mesh);
        if (p.mesh.material && p.mesh.material.dispose) p.mesh.material.dispose();
        this.items.splice(i, 1);
        continue;
      }
      p.vy -= 6.2 * dt;                    // 重力
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.y += p.spin * dt;
      p.mesh.rotation.z += p.spin * 0.6 * dt;
      // 快结束时淡出
      var k = 1 - p.age / p.life;
      if (p.mesh.material) p.mesh.material.opacity = Math.max(0, k);
      if (p.scaleOut) {
        var s = 1 + (p.age / p.life) * p.scaleOut;
        p.mesh.scale.setScalar(s);
      }
    }
  };

  /**
   * 地面扩散光环（点击反馈 / 收集）
   */
  FXManager.prototype.ring = function (pos, colorHex) {
    var mat = new THREE.MeshBasicMaterial({
      color: colorHex, transparent: true, opacity: 0.8, side: THREE.DoubleSide
    });
    var m = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 24), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos.x, 0.12, pos.z);
    this.scene.add(m);
    this.items.push({
      mesh: m, vx: 0, vy: 0, vz: 0, life: 0.75, age: 0, spin: 0,
      isRing: true
    });
  };

  // 环形特效特殊更新（在 update 里统一处理）
  var _origUpdate = FXManager.prototype.update;
  FXManager.prototype.update = function (dt) {
    _origUpdate.call(this, dt);
    for (var i = this.items.length - 1; i >= 0; i--) {
      var p = this.items[i];
      if (!p.isRing) continue;
      p.age += dt;
      if (p.age >= p.life) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.items.splice(i, 1);
        continue;
      }
      var k = p.age / p.life;
      var s = 1 + k * 3.4;
      p.mesh.scale.set(s, s, 1);
      p.mesh.material.opacity = Math.max(0, 0.8 * (1 - k));
    }
  };

  /* ===========================================================
   * 任务管理器
   * =========================================================== */
  function TaskManager(game) {
    this.game = game;              // Game 主对象
    this.tasks = [];
    this.activeTask = null;        // 当前正在进行的任务
    this.completed = {};           // 已完成的任务 id
    this.build();
  }

  /**
   * 定义 5 个任务（顺序固定）
   */
  TaskManager.prototype.build = function () {
    var G = this.game;

    /* ========== 任务 1：帮小兔子找胡萝卜 ========== */
    this.tasks.push({
      id: 'carrot',
      order: 1,
      title: '帮小兔子找胡萝卜',
      icon: '🥕',
      npcKind: 'rabbit',
      eduType: 'observation',          // 观察力
      intro: '我的胡萝卜找不到啦，你可以帮帮我吗？',
      start: function () { G.mg1.start(); },
      update: function (dt) { G.mg1.update(dt); },
      hint: '点点发光的胡萝卜呀',
      done: function () { G.mg1.finish(); }
    });

    /* ========== 任务 2：找到红色的花 ========== */
    this.tasks.push({
      id: 'redFlower',
      order: 2,
      title: '找到红色的花',
      icon: '🌺',
      npcKind: 'deer',
      eduType: 'colors',              // 颜色认知
      intro: '花园里有三朵漂亮的花，你帮我找找红色的那朵好吗？',
      start: function () { G.mg2.start(); },
      update: function (dt) { G.mg2.update(dt); },
      hint: '哪一朵是红色的呀？',
      done: function () { G.mg2.finish(); }
    });

    /* ========== 任务 3：数一数小鸭子 ========== */
    this.tasks.push({
      id: 'countDuck',
      order: 3,
      title: '数一数小鸭子',
      icon: '🦆',
      npcKind: 'bear',
      eduType: 'numbers',             // 数字启蒙 1-10
      intro: '池塘里有几只小鸭子呀？',
      start: function () { G.mg3.start(); },
      update: function (dt) { G.mg3.update(dt); },
      hint: '数一数池塘里的小鸭子',
      done: function () { G.mg3.finish(); }
    });

    /* ========== 任务 4：送小猫回家 ========== */
    this.tasks.push({
      id: 'catHome',
      order: 4,
      title: '送小猫回家',
      icon: '🐱',
      npcKind: 'cat',
      eduType: 'spatial',             // 空间认知（跟随/目标）
      intro: '喵～我找不到回家的路啦，你能送我回家吗？',
      start: function () { G.mg4.start(); },
      update: function (dt) { G.mg4.update(dt); },
      hint: '带小猫走到发光的房子那里',
      done: function () { G.mg4.finish(); }
    });

    /* ========== 任务 5：彩虹宝石 ========== */
    this.tasks.push({
      id: 'rainbowGem',
      order: 5,
      title: '收集彩虹宝石',
      icon: '💎',
      npcKind: 'unicorn',
      eduType: 'colors',              // 颜色 + 顺序
      intro: '花园里藏着五颗彩虹宝石，你能把它们都找到吗？',
      start: function () { G.mg5.start(); },
      update: function (dt) { G.mg5.update(dt); },
      hint: '找找发光的彩色宝石',
      done: function () { G.mg5.finish(); }
    });
  };

  /** 取下一个未完成的任务 */
  TaskManager.prototype.nextTask = function () {
    for (var i = 0; i < this.tasks.length; i++) {
      if (!this.completed[this.tasks[i].id]) return this.tasks[i];
    }
    return null;
  };

  /** 取指定任务 */
  TaskManager.prototype.get = function (id) {
    for (var i = 0; i < this.tasks.length; i++) {
      if (this.tasks[i].id === id) return this.tasks[i];
    }
    return null;
  };

  /** 开始一个任务 */
  TaskManager.prototype.begin = function (id) {
    var t = this.get(id);
    if (!t || this.completed[id]) return false;
    this.activeTask = t;
    this.game.state = 'MINIGAME';
    // 先给个默认标题（万一小游戏的 start() 没有自己设提示条）
    this.game.ui.setTaskHint(t.icon, t.title);
    // 再启动小游戏：它会覆盖成更具体的引导文案（例如"小兔子附近有 3 根胡萝卜"）。
    // 顺序不能反 —— 反了的话小游戏精心写的提示会被这里冲掉。
    t.start();
    return true;
  };

  /** 结束当前任务并给星星 */
  TaskManager.prototype.complete = function () {
    var t = this.activeTask;
    if (!t) return;
    this.completed[t.id] = true;
    this.activeTask = null;
    t.done();
    this.game.onTaskComplete(t);
  };

  /** 每帧更新（只在 MINIGAME 状态下） */
  TaskManager.prototype.update = function (dt) {
    if (this.activeTask) this.activeTask.update(dt);
  };

  /** 已完成数量 */
  TaskManager.prototype.doneCount = function () {
    return Object.keys(this.completed).length;
  };

  /* ===========================================================
   * 小游戏 1：帮小兔子找胡萝卜
   * =========================================================== */
  function MiniGame1(game) {
    this.game = game;
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.carrots = [];
    this.found = 0;
    this.total = 3;
    this.active = false;
    // 注意：不在这里 build()。
    // 胡萝卜位置依赖"小兔子在哪"和"孩子从哪边走过来"，
    // 这些在构造时都还不知道，必须等 start() 时再算。
    this.group.visible = false;
  }

  /**
   * 生成一根胡萝卜
   * @param {number} x
   * @param {number} z
   * @param {number} index
   */
  MiniGame1.prototype.makeCarrot = function (x, z, index) {
    var g = this.game;
    var holder = new THREE.Group();
    holder.position.set(x, 0, z);
    holder.userData = {
      kind: 'item', mg: 'carrot', index: index,
      picked: false
    };

    // float 组：胡萝卜本体 + 叶子都放这里，统一做漂浮旋转动画
    var float = new THREE.Group();
    holder.add(float);

    // 胡萝卜：圆锥倒过来 = 上粗下细的橙锥
    var body = new THREE.Mesh(
      new THREE.ConeGeometry(0.46, 1.7, 12),
      new THREE.MeshLambertMaterial({ color: 0xff9a4d })
    );
    body.rotation.x = Math.PI;   // 尖端朝下
    body.position.y = 0.85;
    body.castShadow = true;
    float.add(body);

    // 叶子
    var leafMat = new THREE.MeshLambertMaterial({ color: 0x6fd88a });
    for (var l = 0; l < 3; l++) {
      var a = (l / 3) * Math.PI * 2;
      var leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), leafMat);
      leaf.position.set(Math.cos(a) * 0.18, 0.9, Math.sin(a) * 0.18);
      leaf.scale.set(0.7, 1.6, 0.5);
      leaf.rotation.z = Math.cos(a) * 0.5;
      leaf.rotation.x = Math.sin(a) * 0.5;
      float.add(leaf);
    }

    // 泥土（固定在地面，不跟着飘）
    var soil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.6, 0.2, 12),
      new THREE.MeshLambertMaterial({ color: 0xbf9468 })
    );
    soil.position.y = 0.1;
    holder.add(soil);

    // 发光光环（固定在地面）——这是孩子最容易看到的指示
    var halo = g.world.makeHalo(0xffd75e);
    holder.add(halo);

    // 悬浮在胡萝卜上方的金色箭头：远远就能看见"这里有东西"
    var arrow = new THREE.Group();
    var cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.9, 5),
      new THREE.MeshLambertMaterial({
        color: 0xffe36b, emissive: 0xaa8800, emissiveIntensity: 0.7
      })
    );
    cone.rotation.x = Math.PI;   // 尖朝下
    arrow.add(cone);
    arrow.position.y = 3.1;
    holder.add(arrow);
    holder.userData.arrow = arrow;

    holder.userData.float = float;
    holder.userData.halo = halo;

    this.group.add(holder);
    this.carrots.push(holder);
    return holder;
  };

  MiniGame1.prototype.build = function () {
    // 旧版本在这里按固定坐标生成 3 根胡萝卜（距离玩家 22~34 单位）。
    // 实测这是「找不到胡萝卜」的根因：孩子站在原地根本看不到，
    // 必须逐个走过去才知道有东西 —— 对 4 岁孩子太难了。
    // 现在改为 start() 时按「小兔子在哪 + 孩子从哪边来」动态生成，
    // 三根胡萝卜都在小兔子附近 6~11 单位内，抬头就能看见。
    this.carrots = [];
  };

  MiniGame1.prototype.start = function () {
    var g = this.game;
    this.active = true;
    this.found = 0;
    this.group.visible = true;

    // 先清掉上一轮可能残留的
    for (var c0 = 0; c0 < this.carrots.length; c0++) {
      g.scene.remove(this.carrots[c0]);
    }
    this.carrots = [];

    // ---- 决定胡萝卜摆在哪 ----
    //
    // 以**小兔子**为圆心，在它周围 6~11 单位摆 3 根。
    // 为什么以兔子为圆心而不是玩家：
    //   孩子是"被小兔子叫过去"的，胡萝卜就该在兔子附近，
    //   这样"找兔子 → 兔子旁边有胡萝卜"是符合直觉的因果关系。
    var rabbit = g.npc.find('rabbit');
    var cx, cz;
    if (rabbit) {
      cx = rabbit.root.position.x;
      cz = rabbit.root.position.z;
    } else {
      cx = g.player.pos.x;
      cz = g.player.pos.z;
    }

    // 从"玩家 → 兔子"的方向往外散开，保证胡萝卜落在孩子面朝的一侧
    var toRabbit = Math.atan2(cx - g.player.pos.x, cz - g.player.pos.z);
    var angles = [0, 0.85, -0.85];
    var dists = [6.5, 9.5, 11.5];
    for (var i = 0; i < this.total; i++) {
      var a = toRabbit + angles[i];
      var d = dists[i];
      this.makeCarrot(
        cx + Math.sin(a) * d,
        cz + Math.cos(a) * d,
        i
      );
    }

    // ---- 给孩子三个层次的提示 ----
    // 1) 文字：告诉他要找什么
    g.ui.setTaskHint('🥕', '小兔子附近有 3 根胡萝卜');
    g.ui.say('⭐', '看！小兔子旁边有 3 根胡萝卜，去点一点吧', 3400);

    // 2) 小星星飞到第一根胡萝卜上方，引导视线
    g.star.guideTo(this.carrots[0].position, 4.0);

    // 3) 镜头稍微拉近并看向胡萝卜区，让孩子一眼看到发光的箭头
    g.focusOn(
      { x: (cx + this.carrots[0].position.x) / 2, y: 0,
        z: (cz + this.carrots[0].position.z) / 2 },
      0.82, 5200
    );

    // 4) 走到兔子旁边（如果孩子还站得远）
    var dToRabbit = Math.hypot(g.player.pos.x - cx, g.player.pos.z - cz);
    if (dToRabbit > 4.5) {
      g.walkTo(cx + 2.2, cz + 2.2);
    }
  };

  MiniGame1.prototype.update = function (dt) {
    var t = this.game.world.time;
    for (var i = 0; i < this.carrots.length; i++) {
      var c = this.carrots[i];
      if (!c.visible) continue;
      // 上下漂浮 + 转圈
      c.userData.float.rotation.y = t * 1.6 + i;
      c.userData.float.position.y = 0.35 + Math.sin(t * 2.4 + i) * 0.18;
      // 地面光环呼吸
      var h = c.userData.halo;
      h.scale.setScalar(1 + Math.sin(t * 3 + i) * 0.16);
      h.rotation.z = t * 0.8;
      // 上方箭头上下跳动（最显眼的指示物）
      var a = c.userData.arrow;
      if (a) {
        a.position.y = 3.0 + Math.sin(t * 2.8 + i * 1.5) * 0.35;
        a.rotation.y = t * 1.5;
      }
    }
  };

  /**
   * 点击到胡萝卜
   * @param {THREE.Object3D} obj 被点中的对象
   * @returns {boolean} 是否消费了这次点击
   */
  MiniGame1.prototype.onPick = function (obj) {
    // 兼容两种调用：射线命中的子 mesh（带 mgRoot），或直接传容器本身
    var root = (obj.userData && obj.userData.mgRoot) || (obj.userData && obj.userData.mg ? obj : null);
    if (!root) return false;
    var idx = root.userData.index;
    if (idx === undefined) return false;
    var c = this.carrots[idx];
    if (!c || c.userData.picked) return false;

    c.userData.picked = true;
    this.found++;

    var pos = c.position.clone();
    pos.y = 1.2;
    this.game.fx.burst(pos, 14, [0xff9a4d, 0xffd75e, 0xfff3a0, 0xffffff], 1);
    this.game.fx.ring(c.position, 0xffd75e);
    global.DDAudio.play('collect');

    // 旋转缩小消失
    c.userData.dying = 0;
    this.animateCollect(c);

    if (this.found >= this.total) {
      var self = this;
      setTimeout(function () {
        self.game.ui.say('🐰', '找到啦！谢谢你！', 2400);
        global.DDAudio.play('taskDone');
        self.game.npc.celebrate && self.game.npc.celebrate();
        self.game.tasks.complete();
      }, 900);
    } else {
      this.game.ui.say('⭐', '找到啦！还有 ' + (this.total - this.found) + ' 个哦', 1800);
    }
    return true;
  };

  MiniGame1.prototype.animateCollect = function (c) {
    var self = this;
    var t0 = performance.now();
    var dur = 500;
    function step() {
      var k = Math.min(1, (performance.now() - t0) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      c.scale.setScalar(1 - e);
      c.userData.float.rotation.y += 0.4;
      c.position.y = e * 1.6;
      if (k < 1) requestAnimationFrame(step);
      else c.visible = false;
    }
    step();
  };

  MiniGame1.prototype.finish = function () {
    this.active = false;
    this.group.visible = false;
    // 把胡萝卜从场景里彻底移除并清空引用。
    // 现在是动态生成的，不清理的话「再玩一次」会越堆越多。
    for (var i = 0; i < this.carrots.length; i++) {
      this.game.scene.remove(this.carrots[i]);
    }
    this.carrots = [];
    this.game.focusOff();
  };

  /* ===========================================================
   * 小游戏 2：找到红色的花
   * =========================================================== */
  function MiniGame2(game) {
    this.game = game;
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.flowers = [];
    this.active = false;
    this.done = false;
    this.build();
    this.group.visible = false;
  }

  /**
   * 生成一朵大花
   * @param {number} x
   * @param {number} z
   * @param {number} hex 花瓣颜色
   * @param {number} index 序号（0=红 1=黄 2=蓝）
   */
  MiniGame2.prototype.makeFlower = function (x, z, hex, index) {
    var holder = new THREE.Group();
    holder.position.set(x, 0, z);
    holder.userData = { kind: 'item', mg: 'redFlower', index: index, picked: false, colorHex: hex };

    var mat = new THREE.MeshLambertMaterial({ color: hex });
    var stemMat = new THREE.MeshLambertMaterial({ color: 0x6fd88a });

    // 茎
    var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.0, 10), stemMat);
    stem.position.y = 1.0;
    stem.castShadow = true;
    holder.add(stem);
    // 叶
    var leaf = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), stemMat);
    leaf.position.set(0.42, 0.75, 0);
    leaf.scale.set(1, 0.28, 0.5);
    leaf.rotation.z = -0.5;
    holder.add(leaf);

    // 花瓣（6 片大大的）
    var petalGrp = new THREE.Group();
    petalGrp.position.y = 2.1;
    for (var p = 0; p < 6; p++) {
      var pa = (p / 6) * Math.PI * 2;
      var petal = new THREE.Mesh(new THREE.SphereGeometry(0.52, 12, 10), mat);
      petal.position.set(Math.cos(pa) * 0.5, 0, Math.sin(pa) * 0.5);
      petal.scale.set(1, 0.42, 0.75);
      petal.rotation.y = -pa;
      petal.castShadow = true;
      petalGrp.add(petal);
    }
    var core = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10),
      new THREE.MeshLambertMaterial({ color: 0xfff3a0, emissive: 0xaa8800, emissiveIntensity: 0.4 }));
    core.scale.set(1, 0.6, 1);
    petalGrp.add(core);
    holder.add(petalGrp);
    holder.userData.petalGrp = petalGrp;

    // 白色光环（提示这里有花，但不提示颜色）
    var halo = this.game.world.makeHalo(0xffffff);
    halo.position.y = 0.1;
    holder.add(halo);
    holder.userData.halo = halo;

    // 上方白色箭头：远远就能看见"这里有三朵花"
    var arrow = new THREE.Group();
    var cone = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.85, 5),
      new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xaaaaaa, emissiveIntensity: 0.5 }));
    cone.rotation.x = Math.PI;
    arrow.add(cone);
    arrow.position.y = 3.5;
    holder.add(arrow);
    holder.userData.arrow = arrow;

    this.group.add(holder);
    this.flowers.push(holder);
    return holder;
  };

  MiniGame2.prototype.build = function () {
    // 旧版本在 build() 里按固定坐标生成三朵花（-6,6 / 0,12 / 6,6）。
    // 花田在地图扩到 82 之后离出生点很远，实测孩子点完小鹿后
    // 有 2/3 的花在画面外（距离 20~23 单位），根本没法比较颜色。
    // 现在改为 start() 时以**小鹿**为圆心现场生成，三朵紧凑散开。
    this.flowers = [];
  };

  MiniGame2.prototype.start = function () {
    var G = this.game;
    this.active = true;
    this.done = false;
    this.group.visible = true;

    // 清掉上一轮
    for (var c0 = 0; c0 < this.flowers.length; c0++) {
      G.scene.remove(this.flowers[c0]);
    }
    this.flowers = [];

    // 以**小鹿**为圆心生成三朵：红 / 黄 / 蓝
    //
    // 为什么以小鹿为圆心：孩子是"被小鹿叫过来"的，
    // 花就该在鹿旁边 —— "找鹿 → 鹿旁边有三朵花"符合直觉。
    //
    // 距离 6 / 8 / 10（走 1 秒左右），三朵都进画面，
    // 这样孩子才能真正"比较三种颜色"，
    // 而不是站在两朵看不见的花面前猜。
    var deer = G.npc.find('deer');
    var cx = deer ? deer.root.position.x : G.player.pos.x;
    var cz = deer ? deer.root.position.z : G.player.pos.z;
    var toDeer = Math.atan2(cx - G.player.pos.x, cz - G.player.pos.z);

    var COLORS = [0xff5f7e, 0xffd93d, 0x5bb8ff];
    var offsets = [0, 0.7, -0.7];
    var dists = [6, 8.5, 10.5];
    for (var i = 0; i < 3; i++) {
      var a = toDeer + offsets[i];
      this.makeFlower(
        cx + Math.sin(a) * dists[i],
        cz + Math.cos(a) * dists[i],
        COLORS[i], i
      );
    }

    G.ui.setTaskHint('🌺', '哪一朵是红色的呀？');
    G.ui.say('🦌', '看！小鹿旁边有三朵花，哪一朵是红色的呀？', 3600);

    // 小星星飞到黄色花上方（引导视线，但不提示颜色）
    G.star.guideTo(this.flowers[1].position, 4.0);

    // 镜头对准三朵花的中心，稍微拉近让孩子看清颜色
    var midX = (this.flowers[0].position.x + this.flowers[2].position.x) / 2;
    var midZ = (this.flowers[0].position.z + this.flowers[2].position.z) / 2;
    G.focusOn({ x: midX, y: 0, z: midZ }, 0.78, 6000);

    // 孩子还站得远就先走到鹿旁边
    var d2 = Math.hypot(G.player.pos.x - cx, G.player.pos.z - cz);
    if (d2 > 4.5) G.walkTo(cx + 2.4, cz + 2.4);
  };

  MiniGame2.prototype.update = function (dt) {
    var t = this.game.world.time;
    for (var i = 0; i < this.flowers.length; i++) {
      var f = this.flowers[i];
      if (!f.visible) continue;
      f.userData.petalGrp.rotation.y = t * 0.8 + i;
      f.userData.petalGrp.position.y = 2.1 + Math.sin(t * 1.8 + i) * 0.09;
      f.userData.halo.scale.setScalar(1 + Math.sin(t * 3 + i) * 0.12);
      // 上方箭头跳动
      var a = f.userData.arrow;
      if (a) {
        a.position.y = 3.4 + Math.sin(t * 2.7 + i * 1.6) * 0.3;
        a.rotation.y = t * 1.3;
      }
    }
  };

  MiniGame2.prototype.onPick = function (obj) {
    // 兼容两种调用：射线命中的子 mesh（带 mgRoot），或直接传容器本身
    var root = (obj.userData && obj.userData.mgRoot) || (obj.userData && obj.userData.mg ? obj : null);
    if (!root || this.done) return false;
    var idx = root.userData.index;
    if (idx === undefined) return false;
    var f = this.flowers[idx];
    if (!f || f.userData.picked) return false;

    if (idx === 0) {
      // 正确：红色
      this.done = true;
      f.userData.picked = true;
      global.DDAudio.play('correct');
      this.game.fx.burst(f.position.clone().setY(2.3), 20, [0xff5f7e, 0xffd93d, 0xffffff], 1.2);
      this.game.fx.ring(f.position, 0xff5f7e);
      this.game.player.jump();
      this.game.ui.say('⭐', '答对啦！', 2000);
      this.game.player.zoomIn();
      setTimeout(function () { this.game.player.zoomOut(); }.bind(this), 1600);

      var self = this;
      setTimeout(function () {
        global.DDAudio.play('taskDone');
        self.game.npc.celebrate && self.game.npc.celebrate();
        self.game.tasks.complete();
      }, 1100);
    } else {
      // 错误：只是轻轻摇晃 + 温柔提示（没有红叉、没有惩罚）
      f.userData.wrongShake = 0.7;
      global.DDAudio.play('gentle');
      this.game.ui.say('⭐', '再看看，红色在哪里呀？', 2400);
      this.shake(f);
    }
    return true;
  };

  MiniGame2.prototype.shake = function (f) {
    var t0 = performance.now();
    var baseX = f.position.x;
    function step() {
      var k = Math.min(1, (performance.now() - t0) / 650);
      f.position.x = baseX + Math.sin(k * Math.PI * 6) * 0.35 * (1 - k);
      f.rotation.z = Math.sin(k * Math.PI * 6) * 0.18 * (1 - k);
      if (k < 1) requestAnimationFrame(step);
      else { f.position.x = baseX; f.rotation.z = 0; }
    }
    step();
  };

  MiniGame2.prototype.finish = function () {
    this.active = false;
    this.group.visible = false;
    this.game.focusOff();
    // 花是动态生成的，彻底移除并清空引用（否则"再玩一次"会累积）
    for (var i = 0; i < this.flowers.length; i++) {
      this.game.scene.remove(this.flowers[i]);
    }
    this.flowers = [];
  };

  /* ===========================================================
   * 小游戏 3：数一数小鸭子
   * =========================================================== */
  function MiniGame3(game) {
    this.game = game;
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.ducks = [];
    this.active = false;
    this.answer = 3;
    this.build();
    this.group.visible = false;
  }

  MiniGame3.prototype.build = function () {
    var pond = this.game.garden.waterArea;
    var positions = [
      { x: pond.x - 2.6, z: pond.z + 1.2 },
      { x: pond.x + 0.4, z: pond.z - 1.8 },
      { x: pond.x + 2.8, z: pond.z + 1.6 }
    ];
    for (var i = 0; i < 3; i++) {
      var d = buildDuck();
      d.position.set(positions[i].x, 0.3, positions[i].z);
      d.userData = { kind: 'duck', index: i, home: d.position.clone() };
      d.rotation.y = i * 2.1;
      this.group.add(d);
      this.ducks.push(d);
    }
  };

  /** 程序化生成一只小鸭子 */
  function buildDuck() {
    var g = new THREE.Group();
    var body = new THREE.Group();
    g.add(body);
    var yellow = new THREE.MeshLambertMaterial({ color: 0xffd93d });
    var orange = new THREE.MeshLambertMaterial({ color: 0xff9a4d });
    var white = new THREE.MeshLambertMaterial({ color: 0xfffdf6 });

    // 身体
    var b = new THREE.Mesh(new THREE.SphereGeometry(0.44, 14, 12), yellow);
    b.scale.set(1.15, 0.92, 1);
    b.position.y = 0.34;
    b.castShadow = true;
    body.add(b);
    // 翅膀
    [-0.38, 0.38].forEach(function (x) {
      var w = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), yellow);
      w.position.set(x, 0.36, 0);
      w.scale.set(0.5, 0.9, 0.8);
      body.add(w);
    });
    // 尾巴
    var tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.32, 8), yellow);
    tail.position.set(0, 0.42, -0.45);
    tail.rotation.x = 0.9;
    body.add(tail);
    // 脖子 + 头
    var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.3, 10), yellow);
    neck.position.set(0, 0.72, 0.24);
    neck.rotation.x = -0.3;
    body.add(neck);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), yellow);
    head.position.set(0, 0.95, 0.32);
    head.castShadow = true;
    body.add(head);
    // 嘴
    var beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 6), orange);
    beak.position.set(0, 0.92, 0.58);
    beak.rotation.x = Math.PI / 2;
    body.add(beak);
    // 眼睛
    [-0.13, 0.13].forEach(function (x) {
      var e = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0x3a2b33 }));
      e.position.set(x, 1.0, 0.52);
      body.add(e);
      var h = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), white);
      h.position.set(x + 0.02, 1.02, 0.57);
      body.add(h);
    });
    // 头顶小呆毛
    var ahoge = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.16, 5), yellow);
    ahoge.position.set(0, 1.24, 0.3);
    ahoge.rotation.z = 0.3;
    body.add(ahoge);

    return g;
  }

  MiniGame3.prototype.start = function () {
    var self = this;
    var G = this.game;
    this.active = true;
    this.group.visible = true;
    for (var i = 0; i < this.ducks.length; i++) {
      this.ducks[i].visible = true;
      this.ducks[i].userData.bobT = Math.random() * Math.PI * 2;
    }
    G.ui.setTaskHint('🦆', '池塘里有几只小鸭子呀？');
    G.ui.say('🐻', '池塘里有几只小鸭子呀？', 2800);

    // 镜头移到池塘边：孩子必须先看见鸭子，才能数。
    // 不这么做的话，问"有几只鸭子"却看不到鸭子，是无意义的题目。
    var pond = G.garden.waterArea;
    G.focusOn(new THREE.Vector3(pond.x, 0, pond.z), 0.72, 4200);

    // 屏幕下半部分出现巨大数字按钮 2 / 3 / 4
    this.game.ui.showChoices([
      { label: '2', onClick: function () { self.pick(2); } },
      { label: '3', onClick: function () { self.pick(3); } },
      { label: '4', onClick: function () { self.pick(4); } }
    ]);
  };

  MiniGame3.prototype.update = function (dt) {
    var t = this.game.world.time;
    for (var i = 0; i < this.ducks.length; i++) {
      var d = this.ducks[i];
      if (!d.visible) continue;
      // 鸭子在水面上轻轻漂 + 上下浮
      d.userData.bobT += dt;
      var bt = d.userData.bobT;
      d.position.y = 0.28 + Math.sin(bt * 1.6) * 0.09;
      d.rotation.z = Math.sin(bt * 1.2) * 0.1;
      d.rotation.y += dt * 0.35;
      // 绕着池塘中心慢慢游
      var home = d.userData.home;
      var pond = this.game.garden.waterArea;
      var ang = Math.atan2(home.z - pond.z, home.x - pond.x) + t * 0.12;
      var r = 4.2;
      d.position.x = pond.x + Math.cos(ang) * r;
      d.position.z = pond.z + Math.sin(ang) * r * 0.72;
    }
  };

  MiniGame3.prototype.pick = function (n) {
    if (!this.active) return;
    var G = this.game;
    if (n === this.answer) {
      this.active = false;
      global.DDAudio.play('correct');
      G.ui.say('🐻', '答对啦！一共有 3 只小鸭子！', 2600);
      G.player.jump();
      G.fx.rain(G.garden.waterArea.x, G.garden.waterArea.z, 16);
      var self = this;
      setTimeout(function () {
        G.ui.hideChoices();
        global.DDAudio.play('taskDone');
        G.npc.celebrate && G.npc.celebrate();
        G.tasks.complete();
      }, 1200);
    } else {
      // 答错：温柔提示，不惩罚
      global.DDAudio.play('gentle');
      G.ui.say('⭐', '再数一数呀，一共有几只呀？', 2400);
      // 让鸭子们跳一下吸引注意
      for (var i = 0; i < this.ducks.length; i++) {
        this.bounceDuck(this.ducks[i]);
      }
    }
  };

  MiniGame3.prototype.bounceDuck = function (d) {
    var t0 = performance.now();
    var baseY = d.position.y;
    function step() {
      var k = Math.min(1, (performance.now() - t0) / 600);
      d.position.y = baseY + Math.abs(Math.sin(k * Math.PI * 2)) * 0.7 * (1 - k * 0.4);
      if (k < 1) requestAnimationFrame(step);
    }
    step();
  };

  MiniGame3.prototype.finish = function () {
    this.active = false;
    this.group.visible = false;
    this.game.ui.hideChoices();
    this.game.focusOff();
  };

  /* ===========================================================
   * 小游戏 4：送小猫回家
   * =========================================================== */
  function MiniGame4(game) {
    this.game = game;
    this.active = false;
    this.following = false;
    this.done = false;
    this.houseLight = null;
    this.marker = null;
  }

  MiniGame4.prototype.start = function () {
    var G = this.game;
    this.active = true;
    this.following = false;
    this.done = false;

    G.ui.setTaskHint('🐱', '带小猫走到发光的房子那里');
    G.ui.say('🐱', '喵～我找不到回家的路啦，你能送我回家吗？', 3000);

    // 房子上出现一个发光的爱心标记
    this.marker = this.buildMarker();
    this.marker.position.set(
      G.garden.housePos.x, 6.2, G.garden.housePos.z
    );
    G.scene.add(this.marker);

    // 房子门发光
    this.houseLight = new THREE.PointLight(0xffd75e, 0, 12);
    this.houseLight.position.set(G.garden.housePos.x, 3, G.garden.housePos.z + 2.6);
    G.scene.add(this.houseLight);

    // 小星星飞向房子，指路
    G.star.guideTo({ x: G.garden.housePos.x + 3, y: 0, z: G.garden.housePos.z + 5 }, 3.2);
  };

  /** 房子上方跳动的爱心标记 */
  MiniGame4.prototype.buildMarker = function () {
    var g = new THREE.Group();
    var shape = new THREE.Shape();
    // 爱心形状
    var w = 1.0, h = 0.95;
    shape.moveTo(0, -h * 0.4);
    shape.bezierCurveTo(-w, h * 0.5, -w, h * 1.2, -w * 0.42, h * 0.72);
    shape.bezierCurveTo(-w * 0.16, h * 0.5, 0, h * 0.2, 0, -h * 0.4);
    shape.bezierCurveTo(0, h * 0.2, w * 0.16, h * 0.5, w * 0.42, h * 0.72);
    shape.bezierCurveTo(w, h * 1.2, w, h * 0.5, 0, -h * 0.4);
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.3, bevelEnabled: true, bevelSize: 0.09,
      bevelThickness: 0.09, bevelSegments: 2
    });
    var mat = new THREE.MeshLambertMaterial({
      color: 0xff9ec4, emissive: 0xff4488, emissiveIntensity: 0.6
    });
    var heart = new THREE.Mesh(geo, mat);
    heart.scale.setScalar(1.1);
    g.add(heart);

    // 外面一圈箭头向下指
    for (var i = 0; i < 2; i++) {
      var cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.6, 4),
        new THREE.MeshLambertMaterial({ color: 0xffe36b, emissive: 0xaa8800, emissiveIntensity: 0.5 })
      );
      cone.rotation.x = Math.PI;
      cone.position.y = -1.4 - i * 0.8;
      g.add(cone);
      g.userData['cone' + i] = cone;
    }
    return g;
  };

  MiniGame4.prototype.update = function (dt) {
    var G = this.game;
    var t = G.world.time;

    // 标记上下浮动 + 箭头闪烁
    if (this.marker) {
      this.marker.position.y = 6.2 + Math.sin(t * 2.4) * 0.4;
      this.marker.rotation.y = t * 1.2;
      if (this.marker.userData.cone0) {
        this.marker.userData.cone0.position.y = -1.4 - ((t * 1.2) % 0.8) * 0.5;
        this.marker.userData.cone1.position.y = -1.4 - ((t * 1.2 + 0.4) % 0.8) * 0.5;
      }
    }

    var cat = G.npc.find('cat');
    if (!cat) { this.checkArrive(); return; }

    var d = Math.hypot(G.player.pos.x - cat.root.position.x, G.player.pos.z - cat.root.position.z);

    if (!this.following && d < 3.0) {
      // 玩家走近小猫 → 小猫开始跟着走
      this.following = true;
      cat.locked = true;      // 锁定：NPC 管理器不要再把它拉回出生点溜达
      G.ui.say('🐱', '谢谢你！我跟着你～', 2400);
      global.DDAudio.play('meow');
    }

    if (this.following && !this.done) {
      // 小猫一直朝玩家移动（不寻路，会自然被地形限制，不会卡死）
      //
      // 速度必须明显快于玩家（玩家 7.2），否则孩子走得快、
      // 小猫永远追不上，任务就卡死。取 11.5：既能稳稳跟上，
      // 又有"小短腿跑得慢"的观感差距。
      var tx = G.player.pos.x;
      var tz = G.player.pos.z - 1.4;   // 跟在玩家身后一点
      var cx = cat.root.position.x, cz = cat.root.position.z;
      var cdx = tx - cx, cdz = tz - cz;
      var cd = Math.hypot(cdx, cdz);
      if (cd > 0.9) {
        var sp = Math.min(cd, 11.5 * dt);
        var nx = cat.root.position.x + (cdx / cd) * sp;
        var nz = cat.root.position.z + (cdz / cd) * sp;
        // 简单阻挡：不让猫进水里/出地图。
        // 注意：这里不能用 player.canWalk —— 它会禁止进入房子周围 4.2 半径，
        // 而"到家"的判定就是 5.5，那样小猫永远走不到门口（死锁）。
        if (this.catCanWalk(nx, nz)) {
          cat.root.position.x = nx;
          cat.root.position.z = nz;
          cat.root.rotation.y = Math.atan2(cdx, cdz);
          // 走路小跳
          cat.root.position.y = Math.abs(Math.sin(t * 14)) * 0.14;
        } else {
          // 被挡住时尝试沿墙滑动，避免卡在池塘边
          if (this.catCanWalk(nx, cat.root.position.z)) {
            cat.root.position.x = nx;
          } else if (this.catCanWalk(cat.root.position.x, nz)) {
            cat.root.position.z = nz;
          } else {
            cat.root.position.y = 0;
          }
        }
      } else {
        cat.root.position.y = 0;
      }
    }

    this.checkArrive();
  };

  /**
   * 小猫自己的可走判定
   * 比玩家宽松：只挡水和地图边界，房子的门口是允许进入的
   */
  MiniGame4.prototype.catCanWalk = function (x, z) {
    var g = this.game.garden;
    if (!g) return true;
    if (Math.hypot(x, z) > g.radius - 2.6) return false;
    if (g.waterArea) {
      var dx = x - g.waterArea.x, dz = z - g.waterArea.z;
      if (Math.sqrt(dx * dx + dz * dz) < g.waterArea.r) {
        // 桥上可以走（复用 player 的斜桥判定）
        if (this.game.player.onBridge(x, z)) return true;
        return false;
      }
    }
    return true;
  };

  /** 判断是否到家了 */
  MiniGame4.prototype.checkArrive = function () {
    var G = this.game;
    if (this.done) return;
    var cat = G.npc.find('cat');
    if (!cat) return;

    var h = G.garden.housePos;
    var d = Math.hypot(cat.root.position.x - h.x, cat.root.position.z - h.z);
    if (d < 5.5) {
      this.done = true;
      this.following = false;

      // 小猫"跑进"家门
      var catRoot = cat.root;
      // 先记下起点（必须在动画闭包之前取，否则闭包里拿到的是 undefined）
      var catStart = { x: catRoot.position.x, z: catRoot.position.z };
      var t0 = performance.now();
      (function run() {
        var k = Math.min(1, (performance.now() - t0) / 900);
        var e = 1 - Math.pow(1 - k, 2);
        catRoot.position.x = catStart.x + (h.x + 2.4 - catStart.x) * e;
        catRoot.position.z = catStart.z + (h.z + 2.4 - catStart.z) * e;
        catRoot.position.y = Math.abs(Math.sin(k * Math.PI * 4)) * 0.5;
        catRoot.rotation.y = Math.atan2(h.x - catStart.x, h.z - catStart.z);
        if (k < 1) requestAnimationFrame(run);
        else {
          // 到家后藏起来
          catRoot.visible = false;
        }
      })();

      global.DDAudio.play('meow');
      G.ui.say('🐱', '我到家啦！谢谢你！', 2600);
      G.player.jump();
      G.fx.burst({ x: h.x, y: 3, z: h.z + 2.4 }, 20, [0xff9ec4, 0xffe36b, 0xffffff], 1.2);
      G.player.zoomIn();
      setTimeout(function () { G.player.zoomOut(); }, 1500);

      setTimeout(function () {
        global.DDAudio.play('taskDone');
        G.npc.celebrate && G.npc.celebrate();
        G.tasks.complete();
      }, 1300);
    }
  };

  MiniGame4.prototype.finish = function () {
    var G = this.game;
    this.active = false;
    this.following = false;
    this.done = false;
    this.game.focusOff();
    if (this.marker) {
      G.scene.remove(this.marker);
      disposeObj(this.marker);
      this.marker = null;
    }
    if (this.houseLight) {
      G.scene.remove(this.houseLight);
      this.houseLight = null;
    }
    // 小猫先藏起来（下次重玩再放出来）
    var cat = G.npc.find('cat');
    if (cat) {
      cat.locked = false;
      cat.root.visible = false;
    }
  };

  function disposeObj(o) {
    o.traverse(function (c) {
      if (c.geometry && c.geometry.dispose) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
  }

  /* ===========================================================
   * 小游戏 5：彩虹宝石（红橙黄绿蓝）
   * =========================================================== */
  function MiniGame5(game) {
    this.game = game;
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.gems = [];
    this.lightPillars = [];
    this.found = 0;
    this.total = 5;
    this.active = false;
    this.build();
    this.group.visible = false;
  }

  MiniGame5.prototype.build = function () {
    var colors = [
      { hex: 0xff5f7e, name: '红色' },
      { hex: 0xffa14f, name: '橙色' },
      { hex: 0xffd93d, name: '黄色' },
      { hex: 0x63d68a, name: '绿色' },
      { hex: 0x5bb8ff, name: '蓝色' }
    ];

    // 宝石位置**不写死**，改成 start() 时以玩家为圆心现场生成。
    //
    // 原因：地图从 46 扩到 82 之后，原来的固定坐标（最远 52 单位）
    // 会让孩子走 7 秒才能看到下一个 —— 实测这是"找不到"同类问题。
    // 而且孩子玩到这一步时站的位置不可预测，写死坐标必然出问题。
    this.spots = [];
  };

  /**
   * 围绕玩家生成 5 颗宝石
   * @param {THREE.Vector3} center 圆心（通常是玩家位置）
   */
  MiniGame5.prototype.spawnGems = function (center) {
    var colors = [
      0xff5f7e, 0xffa14f, 0xffd93d, 0x63d68a, 0x5bb8ff
    ];
    // 清掉上一轮的
    for (var i = 0; i < this.gems.length; i++) {
      this.game.scene.remove(this.gems[i]);
    }
    this.gems = [];
    this.spots = [];

    // 在玩家周围摆一圈，5 个方向各一个，距离 7~12（走 1 秒左右）。
    // 全部要落进画面：孩子得能同时看到"还有几颗没找"，
    // 散太开就会有一半在屏幕外，他根本不知道自己漏了哪几颗。
    var base = Math.random() * Math.PI * 2;
    for (var k = 0; k < 5; k++) {
      var a = base + (k / 5) * Math.PI * 2;
      var d = 7 + (k % 3) * 2.5;
      this.spots.push({
        x: center.x + Math.sin(a) * d,
        z: center.z + Math.cos(a) * d
      });
    }

    for (var m = 0; m < 5; m++) {
      var holder = new THREE.Group();
      holder.position.set(this.spots[m].x, 0, this.spots[m].z);
      holder.userData = {
        kind: 'item', mg: 'rainbowGem', index: m, picked: false, hex: colors[m]
      };

      // 宝石：八面体
      var gemMat = new THREE.MeshLambertMaterial({
        color: colors[m], emissive: colors[m], emissiveIntensity: 0.45
      });
      var gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), gemMat);
      gem.position.y = 1.6;
      gem.castShadow = true;
      holder.add(gem);
      holder.userData.gem = gem;

      // 底座：小台子
      var base2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.9, 0.32, 12),
        new THREE.MeshLambertMaterial({ color: 0xfff3dc })
      );
      base2.position.y = 0.16;
      holder.add(base2);

      // 发光光环
      var halo = this.game.world.makeHalo(colors[m]);
      holder.add(halo);
      holder.userData.halo = halo;

      // 上方金色箭头（和胡萝卜一致，远近都能看见）
      var arrow = new THREE.Group();
      var cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.44, 0.95, 5),
        new THREE.MeshLambertMaterial({
          color: 0xffe36b, emissive: 0xaa8800, emissiveIntensity: 0.7
        })
      );
      cone.rotation.x = Math.PI;
      arrow.add(cone);
      arrow.position.y = 3.3;
      holder.add(arrow);
      holder.userData.arrow = arrow;

      // 光柱（收集后点亮）
      var pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.42, 6, 12, 1, true),
        new THREE.MeshLambertMaterial({
          color: colors[m], emissive: colors[m], emissiveIntensity: 0.7,
          transparent: true, opacity: 0, side: THREE.DoubleSide
        })
      );
      pillar.position.y = 3;
      pillar.visible = false;
      holder.add(pillar);
      holder.userData.pillar = pillar;

      this.group.add(holder);
      this.gems.push(holder);
    }
  };

  MiniGame5.prototype.start = function () {
    var G = this.game;
    this.active = true;
    this.found = 0;
    this.group.visible = true;

    // 以玩家为圆心现场生成 5 颗宝石（见 spawnGems 注释）
    this.spawnGems(G.player.pos);

    G.ui.setTaskHint('💎', '周围有 5 颗彩色宝石');
    G.ui.say('🦄', '看！周围有 5 颗彩色宝石，都去点一点吧', 3600);

    // 小星星飞到最近的一颗上方
    var nearest = this.gems[0];
    var nd = Infinity;
    for (var i = 0; i < this.gems.length; i++) {
      var d = Math.hypot(this.gems[i].position.x - G.player.pos.x,
                         this.gems[i].position.z - G.player.pos.z);
      if (d < nd) { nd = d; nearest = this.gems[i]; }
    }
    G.star.guideTo(nearest.position, 4.0);

    // 镜头拉高，5 颗尽量都进画面
    G.focusOn({ x: G.player.pos.x, y: 0, z: G.player.pos.z }, 1.08, 5000);
  };

  MiniGame5.prototype.update = function (dt) {
    var t = this.game.world.time;
    for (var i = 0; i < this.gems.length; i++) {
      var g = this.gems[i];
      if (!g.visible) continue;
      if (!g.userData.picked) {
        g.userData.gem.rotation.y = t * 1.6;
        g.userData.gem.rotation.x = Math.sin(t * 1.1 + i) * 0.25;
        g.userData.gem.position.y = 1.6 + Math.sin(t * 2.6 + i) * 0.2;
        g.userData.halo.scale.setScalar(1 + Math.sin(t * 3.4 + i) * 0.16);
        g.userData.halo.rotation.z = t * 0.6;
        // 上方箭头跳动（最显眼的指示）
        var a = g.userData.arrow;
        if (a) {
          a.position.y = 3.2 + Math.sin(t * 2.8 + i * 1.4) * 0.35;
          a.rotation.y = t * 1.5;
        }
      } else if (g.userData.pillar.visible) {
        g.userData.pillar.material.opacity = 0.24 + Math.sin(t * 2.2 + i) * 0.1;
        g.userData.pillar.rotation.y = t * 0.5;
      }
    }
  };

  MiniGame5.prototype.onPick = function (obj) {
    // 兼容两种调用：射线命中的子 mesh（带 mgRoot），或直接传容器本身
    var root = (obj.userData && obj.userData.mgRoot) || (obj.userData && obj.userData.mg ? obj : null);
    if (!root) return false;
    var idx = root.userData.index;
    if (idx === undefined) return false;
    var g = this.gems[idx];
    if (!g || g.userData.picked) return false;

    g.userData.picked = true;
    this.found++;

    // 收集特效
    var pos = g.position.clone(); pos.y = 1.6;
    this.game.fx.burst(pos, 16, [g.userData.hex, 0xffffff, 0xfff3a0], 1.1);
    this.game.fx.ring(g.position, g.userData.hex);
    global.DDAudio.play('collect');
    this.game.player.jump();

    // 宝石飞向小星星然后消失
    this.animateGem(g);

    // 点亮光柱
    g.userData.pillar.visible = true;
    g.userData.pillar.material.opacity = 0.3;

    var colorNames = ['红色', '橙色', '黄色', '绿色', '蓝色'];
    this.game.ui.say('⭐', '找到了' + colorNames[idx] + '宝石！', 1800);

    if (this.found >= this.total) {
      var self = this;
      setTimeout(function () {
        self.game.ui.say('🦄', '五颗宝石都找到啦！彩虹出现了！', 3000);
        global.DDAudio.play('rainbow');
        self.showRainbow();
        self.game.npc.celebrate && self.game.npc.celebrate();
        self.game.fx.rain(self.game.player.pos.x, self.game.player.pos.z, 30);
        setTimeout(function () {
          global.DDAudio.play('taskDone');
          self.game.tasks.complete();
        }, 2200);
      }, 1000);
    }
    return true;
  };

  MiniGame5.prototype.animateGem = function (g) {
    var gem = g.userData.gem;
    var t0 = performance.now();
    var startY = gem.position.y;
    function step() {
      var k = Math.min(1, (performance.now() - t0) / 520);
      var e = 1 - Math.pow(1 - k, 3);
      gem.position.y = startY + e * 1.8;
      gem.scale.setScalar(1 - e);
      gem.rotation.y += 0.5;
      if (k < 1) requestAnimationFrame(step);
      else gem.visible = false;
    }
    step();
  };

  /** 大彩虹出现动画 */
  MiniGame5.prototype.showRainbow = function () {
    var rb = this.game.garden.bigRainbow;
    if (!rb) return;
    rb.visible = true;
    var t0 = performance.now();
    var self = this;
    (function grow() {
      var k = Math.min(1, (performance.now() - t0) / 1800);
      var e = 1 - Math.pow(1 - k, 4);
      rb.scale.setScalar(0.001 + e * 1.0);
      if (k < 1) requestAnimationFrame(grow);
      else self.game.onAllTasksDone();
    })();
  };

  MiniGame5.prototype.finish = function () {
    this.active = false;
    this.group.visible = false;
    this.game.focusOff();
    // 宝石是动态生成的，彻底移除并清空引用，
    // 否则「再玩一次」会不断累积新对象。
    for (var i = 0; i < this.gems.length; i++) {
      this.game.scene.remove(this.gems[i]);
    }
    this.gems = [];
  };

  /* ===========================================================
   * 导出
   * =========================================================== */
  global.DDFX = FXManager;
  global.DDTaskManager = TaskManager;
  global.DDMiniGames = {
    1: MiniGame1, 2: MiniGame2, 3: MiniGame3, 4: MiniGame4, 5: MiniGame5
  };
})(window);
