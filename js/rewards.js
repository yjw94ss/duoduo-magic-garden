/* ===========================================================
 * rewards.js —— 游戏数据（localStorage）+ 魔法星星 + 宝箱奖励
 *
 * 安全设计：
 *  - 不收集任何儿童姓名、照片、地址、电话
 *  - 只在本机浏览器 localStorage 存：星星数、完成任务、时长、奖励
 * =========================================================== */
(function (global) {
  'use strict';

  var THREE = global.THREE;
  var SAVE_KEY = 'duoduo_garden_save_v1';

  /* ---------- 可获得的奖励（只存在游戏内，无付费/抽卡/商城） ---------- */
  var REWARDS = [
    { id: 'crown',    emoji: '👑', name: '粉色皇冠',   desc: '戴在小朵朵头上最好看啦！' },
    { id: 'wand',     emoji: '🪄', name: '星星魔法棒', desc: '挥一挥，花朵就会跳舞～' },
    { id: 'backpack', emoji: '🎒', name: '兔兔背包',   desc: '里面装得下胡萝卜和小星星。' },
    { id: 'dress',    emoji: '👗', name: '彩虹裙子',   desc: '走到哪里都像小彩虹。' },
    { id: 'pet',      emoji: '🐱', name: '小猫宠物',   desc: '它会一直陪着你睡觉觉。' }
  ];

  /* ===========================================================
   * 存档管理
   * =========================================================== */
  var Save = {
    data: null,

    /** 读取存档（带默认值保护） */
    load: function () {
      var def = {
        stars: 0,                 // 已获得魔法星星数
        tasksDone: [],            // 已完成任务 id
        rewards: [],              // 已获得奖励 id
        totalPlaySeconds: 0,      // 累计游戏秒数
        todaySeconds: 0,          // 今日游戏秒数
        todayDate: '',            // 今日日期字符串
        playDays: 0,              // 玩过几天
        lastPlayedDate: '',
        colorEduDone: false,      // 颜色认知是否完成
        numberEduDone: false,     // 数字认知是否完成
        soundOn: true             // 声音开关
      };
      try {
        var raw = global.localStorage.getItem(SAVE_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          for (var k in def) {
            if (Object.prototype.hasOwnProperty.call(parsed, k)) def[k] = parsed[k];
          }
        }
      } catch (e) {
        console.warn('[存档] 读取失败，使用默认存档', e);
      }
      this.data = def;
      this.checkNewDay();
      return def;
    },

    /** 保存 */
    save: function () {
      try {
        global.localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
      } catch (e) {
        console.warn('[存档] 写入失败（可能是隐私模式）', e);
      }
    },

    /** 跨天检测：新的一天重置"今日时长" */
    checkNewDay: function () {
      var today = this.getDateStr();
      if (this.data.todayDate !== today) {
        if (this.data.todayDate !== '') {
          // 不是第一次：累计一个"玩过一天"
          this.data.playDays += 1;
        }
        this.data.todayDate = today;
        this.data.todaySeconds = 0;
        this.data.lastPlayedDate = today;
        this.save();
      }
    },

    getDateStr: function () {
      var d = new Date();
      var m = d.getMonth() + 1, day = d.getDate();
      return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
    },

    /** 累加游戏时长（每 5 秒调用一次即可） */
    addPlayTime: function (sec) {
      this.data.todaySeconds += sec;
      this.data.totalPlaySeconds += sec;
      this.save();
    },

    /** 加星 */
    addStar: function () {
      this.data.stars = Math.min(5, this.data.stars + 1);
      this.save();
      return this.data.stars;
    },

    /** 标记任务完成 */
    markTask: function (id) {
      if (this.data.tasksDone.indexOf(id) < 0) {
        this.data.tasksDone.push(id);
      }
      this.save();
    },

    /** 记录奖励 */
    addReward: function (id) {
      if (this.data.rewards.indexOf(id) < 0) {
        this.data.rewards.push(id);
      }
      this.save();
    },

    /** 随机抽一个还没拿过的奖励；全拿了就随机重复 */
    getRandomReward: function () {
      var pool = REWARDS.filter(function (r) {
        return this.data.rewards.indexOf(r.id) < 0;
      }, this);
      if (pool.length === 0) pool = REWARDS;
      return pool[Math.floor(Math.random() * pool.length)];
    },

    /** 清空本机记录 */
    reset: function () {
      try { global.localStorage.removeItem(SAVE_KEY); } catch (e) { /* 忽略 */ }
      this.load();
    }
  };

  /* ===========================================================
   * 魔法星星（3D 场景里飘的那颗）
   * =========================================================== */
  function MagicStar(scene) {
    this.scene = scene;
    var shape = new THREE.Shape();
    var pts = 5, outer = 0.5, inner = 0.22;
    for (var i = 0; i < pts * 2; i++) {
      var r = (i % 2 === 0) ? outer : inner;
      var a = (i * Math.PI / pts) - Math.PI / 2;
      var x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.18, bevelEnabled: true, bevelSize: 0.06,
      bevelThickness: 0.06, bevelSegments: 2
    });
    var mat = new THREE.MeshLambertMaterial({
      color: 0xfff3a0, emissive: 0xffcc33, emissiveIntensity: 0.75
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.scale.set(1, 1, 0.5);
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    this.t = 0;
  }

  /** 更新：自转 + 上下浮 */
  MagicStar.prototype.update = function (dt) {
    this.t += dt;
    this.mesh.rotation.y += dt * 1.5;
    this.mesh.rotation.z = Math.sin(this.t * 1.2) * 0.2;
  };

  /* ===========================================================
   * 魔法宝箱
   * =========================================================== */
  function TreasureChest(scene, garden) {
    this.scene = scene;
    this.opened = false;
    this.group = new THREE.Group();
    this.group.position.set(0, 0, 6);
    this.group.visible = false;
    scene.add(this.group);

    var wood = new THREE.MeshLambertMaterial({ color: 0xc79358 });
    var woodDark = new THREE.MeshLambertMaterial({ color: 0xa9773f });
    var gold = new THREE.MeshLambertMaterial({
      color: 0xffd75e, emissive: 0xaa7700, emissiveIntensity: 0.5
    });

    // 箱体
    var box = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 1.6), wood);
    box.position.y = 0.7;
    box.castShadow = true;
    this.group.add(box);

    // 箱盖（会打开的那一半）
    this.lid = new THREE.Group();
    this.lid.position.set(0, 1.4, -0.8);
    var lidMesh = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.5, 1.7), woodDark);
    lidMesh.position.set(0, 0.25, 0.8);
    lidMesh.castShadow = true;
    this.lid.add(lidMesh);
    // 盖子上的金色包边
    var band = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.12, 1.76), gold);
    band.position.set(0, 0.44, 0.8);
    this.lid.add(band);
    this.group.add(this.lid);

    // 正面的锁扣
    var lock = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.2), gold);
    lock.position.set(0, 1.3, 0.86);
    this.group.add(lock);

    // 两侧包边
    [-1.05, 1.05].forEach(function (x) {
      var b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.45, 1.7), gold);
      b.position.set(x, 0.7, 0);
      this.group.add(b);
    }, this);

    // 底座：一个小台子
    var podium = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.6, 0.4, 20),
      new THREE.MeshLambertMaterial({ color: 0xfff3dc })
    );
    podium.position.y = 0.2;
    podium.receiveShadow = true;
    this.group.add(podium);

    // 光柱（打开时升起）
    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.3, 12, 16, 1, true),
      new THREE.MeshLambertMaterial({
        color: 0xfff0a0, emissive: 0xffdd66, emissiveIntensity: 0.8,
        transparent: true, opacity: 0, side: THREE.DoubleSide
      })
    );
    this.beam.position.y = 6;
    this.group.add(this.beam);

    // 地面光环
    this.halo = new THREE.Mesh(
      new THREE.RingGeometry(2.6, 3.2, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffe36b, transparent: true, opacity: 0.5, side: THREE.DoubleSide
      })
    );
    this.halo.rotation.x = -Math.PI / 2;
    this.halo.position.y = 0.06;
    this.group.add(this.halo);

    // 交互标记：可点击
    this.group.traverse(function (o) {
      if (o.isMesh) o.userData = { kind: 'chest' };
    });

    this.t = 0;
  }

  /** 显示宝箱（集齐 5 星后） */
  TreasureChest.prototype.show = function () {
    this.group.visible = true;
    this.opened = false;
    this.lid.rotation.x = 0;
    this.beam.material.opacity = 0;
    this.t = 0;
  };

  TreasureChest.prototype.update = function (dt) {
    this.t += dt;
    if (!this.group.visible) return;
    // 未打开：上下浮 + 光环转
    if (!this.opened) {
      this.group.position.y = Math.sin(this.t * 1.6) * 0.16;
      this.halo.rotation.z = this.t * 0.6;
      this.halo.material.opacity = 0.35 + Math.sin(this.t * 2.4) * 0.15;
    } else {
      this.group.position.y = 0;
      this.beam.material.opacity = 0.28 + Math.sin(this.t * 3) * 0.08;
      this.beam.rotation.y = this.t * 0.8;
    }
  };

  /**
   * 开箱动画
   * @param {function} onDone 动画结束后回调（会弹奖励弹层）
   */
  TreasureChest.prototype.open = function (onDone) {
    if (this.opened) return;
    this.opened = true;
    var self = this;
    var t0 = performance.now();

    function step() {
      var k = Math.min(1, (performance.now() - t0) / 1100);
      var e = 1 - Math.pow(1 - k, 3);
      // 箱盖打开
      self.lid.rotation.x = -e * 1.9;
      // 光柱升起
      self.beam.material.opacity = e * 0.35;
      self.beam.position.y = 6;
      self.beam.scale.set(1, e, 1);
      if (k < 1) {
        requestAnimationFrame(step);
      } else {
        global.DDAudio.play('chest');
        if (onDone) onDone();
      }
    }
    step();
  };

  global.DDSave = Save;
  global.DDRewards = REWARDS;
  global.DDMagicStar = MagicStar;
  global.DDTreasureChest = TreasureChest;
})(window);
