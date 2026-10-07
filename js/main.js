/* ===========================================================
 * main.js —— 游戏主控
 *
 * 状态机：LOGO → CHARACTER_SELECT → PLAYING ⇄ MINIGAME
 *                    → REWARD → FINISHED
 *
 * 本文件负责：
 *  - Three.js 渲染器初始化（含移动端性能优化）
 *  - 鼠标 / 触摸统一拾取（点地面走、点 NPC 互动、点物品收集）
 *  - 10 秒无操作 → 小星星飞向目标 + 箭头 + NPC 挥手
 *  - 游戏时长统计
 * =========================================================== */
(function (global) {
  'use strict';

  var THREE = global.THREE;

  function $(id) { return document.getElementById(id); }

  /* ===========================================================
   * Game 主对象
   * =========================================================== */
  var Game = {
    state: 'LOGO',          // LOGO / CHARACTER_SELECT / PLAYING / MINIGAME / REWARD / FINISHED
    scene: null,
    camera: null,
    renderer: null,
    world: null,
    garden: null,
    player: null,
    npc: null,
    star: null,             // 小星星
    tasks: null,
    fx: null,
    chest: null,
    ui: null,

    raycaster: null,
    pointer: new THREE.Vector2(),
    groundPlane: null,      // 用于把射线投到地面

    idleTimer: 0,           // 无操作计时
    lastInteraction: 0,
    playTimeAcc: 0,         // 时长累计（秒，累加到 5 秒才写盘）
    pickables: [],          // 所有可点击对象

    started: false,
    lastFrame: 0,

    /* =======================================================
     * 启动
     * ======================================================= */
    boot: function () {
      var self = this;
      this.ui = global.DDUI;
      this.ui.init();

      /* ---------- 1. 渲染器 ---------- */
      var canvas = $('game-canvas');
      var renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: false,
        // 移动端用低精度，省电
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(this.getPixelRatio());
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      // 输出色彩空间：让颜色更鲜亮
      // （r160 起 outputEncoding 已被移除，必须用 outputColorSpace）
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer = renderer;

      /* ---------- 2. 世界 ---------- */
      var init = global.DDWorld.init(renderer, 'rainbow_garden');
      this.scene = init.scene;
      this.camera = init.camera;
      this.world = global.DDWorld;
      this.garden = init.garden;

      /* ---------- 3. 射线拾取工具 ---------- */
      this.raycaster = new THREE.Raycaster();
      // 一个水平面，用来把屏幕点击换算成世界坐标
      this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

      /* ---------- 4. 特效 ---------- */
      this.fx = new global.DDFX(this.scene);

      /* ---------- 5. 存档 ---------- */
      global.DDSave.load();
      var sd = global.DDSave.data;
      this.ui.setStars(0, 5);
      // 这里只同步图标，不启动音频：
      // 浏览器规定 AudioContext 必须在"用户手势"里创建/恢复，
      // 提前 startMusic 会触发 autoplay 警告并被静音。
      // 真正的音频解锁放在"开始游戏"按钮的点击回调里。
      this.ui.setSoundIcon(sd.soundOn !== false);

      /* ---------- 6. 输入绑定 ---------- */
      this.bindInput();

      /* ---------- 7. 开场 ---------- */
      this.ui.showScreen('logo');
      this.ui.hideLoading();

      // Logo 背后放一个"展示用"的角色，让首页不是空背景
      this.setupPreview();

      // 预热一帧，避免第一帧卡顿
      this.renderer.render(this.scene, this.camera);

      // 开始主循环
      this.lastFrame = performance.now();
      requestAnimationFrame(function (t) { self.loop(t); });

      // 页面隐藏时暂停，省电
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          global.DDAudio.stopMusic();
        } else if (global.DDAudio.enabled) {
          global.DDAudio.startMusic();
        }
      });
    },

    /**
     * 根据屏幕形状选择相机距离
     *
     * 竖屏手机可视高度大但宽度小，同一个偏移下画面显得又窄又远，
     * 所以竖屏要拉远一点、抬高一点，孩子才能看清周围有哪些目标。
     *
     * @returns {THREE.Vector3}
     */
    getCamOffsetForScreen: function () {
      var w = global.innerWidth, h = global.innerHeight;
      if (h > w * 1.15) {
        // 竖屏（手机）：视野要更宽，孩子才能看到远处的目标
        return new THREE.Vector3(0, 19, 25);
      }
      // 横屏 / 桌面：拉到 20 高、26 远。
      // 地图扩到 82 之后相机必须跟着拉远，
      // 否则孩子走到探索区就只能看见眼前一小块，会以为"没路了"。
      return new THREE.Vector3(0, 20, 26);
    },

    /**
     * 像素比：手机上限制 2，高分屏不会太卡
     */
    getPixelRatio: function () {
      var dpr = global.devicePixelRatio || 1;
      // 平板/手机最高 2；桌面最高 1.75
      var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      return isMobile ? Math.min(dpr, 2) : Math.min(dpr, 1.75);
    },

    /* =======================================================
     * 首页展示用的角色预览
     * ======================================================= */
    setupPreview: function () {
      // 用默认角色在首页背后站着
      this.previewPlayer = new global.DDPlayer(
        this.scene, this.camera, this.garden, 'princess'
      );
      this.previewPlayer.pos.set(0, 0, 10);
      this.previewPlayer.camOffset.set(0, 6, 16);
      this.previewPlayer.target.set(0, 0, 10);
      // 首页不放小动物，避免分散注意力
    },

    /* =======================================================
     * 输入：鼠标 + 触摸统一
     * ======================================================= */
    bindInput: function () {
      var self = this;
      var canvas = $('game-canvas');

      function toPointer(ev) {
        var r = canvas.getBoundingClientRect();
        var cx = (ev.touches ? ev.touches[0].clientX : ev.clientX);
        var cy = (ev.touches ? ev.touches[0].clientY : ev.clientY);
        self.pointer.x = ((cx - r.left) / r.width) * 2 - 1;
        self.pointer.y = -((cy - r.top) / r.height) * 2 + 1;
      }

      // 用 pointer 事件，同时覆盖鼠标和触摸
      function onDown(ev) {
        // 解锁音频（浏览器要求用户手势）
        global.DDAudio.init();
        global.DDAudio.resume();
        if (global.DDAudio.enabled) global.DDAudio.startMusic();

        toPointer(ev);
        self.onScreenTap();
      }

      if (global.PointerEvent) {
        canvas.addEventListener('pointerdown', onDown);
      } else {
        // 老设备回退
        canvas.addEventListener('mousedown', onDown);
        canvas.addEventListener('touchstart', function (ev) {
          ev.preventDefault();
          onDown(ev);
        }, { passive: false });
      }

      // 阻止移动端双击缩放 / 下拉刷新
      canvas.addEventListener('touchmove', function (ev) { ev.preventDefault(); }, { passive: false });
      canvas.addEventListener('gesturestart', function (ev) { ev.preventDefault(); });
      // iOS Safari 的 pinch 手势
      document.addEventListener('gesturechange', function (ev) { ev.preventDefault(); });
      // 整页禁止双击选中/缩放（canvas 之外的区域也不会误触）
      document.addEventListener('touchstart', function (ev) {
        if (ev.touches.length > 1) ev.preventDefault();   // 双指
      }, { passive: false });

      // 窗口尺寸变化
      global.addEventListener('resize', function () { self.onResize(); });
      global.addEventListener('orientationchange', function () {
        setTimeout(function () { self.onResize(); }, 220);
      });

      // iOS Safari 特有：软键盘弹出/收起会连续触发 resize，
      // 如果每次都重建渲染尺寸，孩子点按钮时画面会"跳一下"，
      // 点击坐标也会偏移（点 A 却触发 B）。
      // 这里加一个防抖：短时间内只认最后一次。
      self._resizeTimer = null;
      global.addEventListener('resize', function () {
        clearTimeout(self._resizeTimer);
        self._resizeTimer = setTimeout(function () { self.onResize(); }, 180);
      });

      /* ---------- 按钮绑定 ---------- */
      $('btn-start').addEventListener('click', function () {
        global.DDAudio.play('click');
        global.DDAudio.init();
        global.DDAudio.startMusic();
        self.enterCharacterSelect();
      });

      $('btn-sound').addEventListener('click', function () {
        var on = global.DDAudio.toggle();
        self.ui.setSoundIcon(on);
        global.DDSave.data.soundOn = on;
        global.DDSave.save();
        if (on) global.DDAudio.play('click');
      });

      // 角色卡选择
      var cards = document.querySelectorAll('.char-card');
      for (var i = 0; i < cards.length; i++) {
        (function (card) {
          card.addEventListener('click', function () {
            global.DDAudio.play('click');
            for (var j = 0; j < cards.length; j++) cards[j].classList.remove('chosen');
            card.classList.add('chosen');
            // 选好后 400ms 自动进入（少一次点击，对 4 岁孩子更友好）
            setTimeout(function () { self.startGame(card.dataset.char); }, 420);
          });
        })(cards[i]);
      }

      $('btn-replay').addEventListener('click', function () {
        global.DDAudio.play('click');
        self.restart(true);
      });

      $('btn-freeplay').addEventListener('click', function () {
        global.DDAudio.play('click');
        self.freePlay();
      });
    },

    /**
     * 进入角色选择
     */
    enterCharacterSelect: function () {
      this.state = 'CHARACTER_SELECT';
      this.ui.showScreen('select');
    },

    /* =======================================================
     * 开始正式游戏
     * ======================================================= */
    startGame: function (outfitKey) {
      var self = this;
      this.ui.hideScreens();
      this.state = 'PLAYING';
      this.ui.showHud(true);
      this.started = true;

      // 移除首页的展示角色。
      // 必须做：否则预览角色会和玩家角色同时站在场景里（出现两个小女孩）。
      if (this.previewPlayer) {
        this.scene.remove(this.previewPlayer.rig.root);
        this.previewPlayer = null;
      }

      // 创建真正的玩家角色
      this.player = new global.DDPlayer(this.scene, this.camera, this.garden, outfitKey);
      this.player.camOffset.copy(this.getCamOffsetForScreen());

      // ---------- NPC ----------
      this.npc = new global.DDNPC(this.scene, this.garden);
      this.npc.add('rabbit',   { x: -14, z: 4 },  {
        task: 'carrot', name: '小兔子', id: 'npc_rabbit', scale: 1.0,
        lines: ['我的胡萝卜找不到啦！', '你能帮帮我吗？']
      });
      this.npc.add('deer',     { x: 8, z: -12 },  {
        task: 'redFlower', name: '小鹿', id: 'npc_deer', scale: 1.0,
        lines: ['哇，这里的花开得真好！']
      });
      this.npc.add('bear',     { x: -12, z: 22 }, {
        task: 'countDuck', name: '小熊', id: 'npc_bear', scale: 1.0,
        lines: ['池塘里有小鸭子吗？']
      });
      this.npc.add('cat',      { x: 10, z: 8 },   {
        task: 'catHome', name: '小猫', id: 'npc_cat', scale: 1.0,
        lines: ['喵～']
      });
      this.npc.add('unicorn',  { x: 0, z: -22 }, {
        task: 'rainbowGem', name: '独角兽', id: 'npc_unicorn', scale: 0.85,
        lines: ['彩虹宝石藏在花园里哦！']
      });
      // 蝴蝶只是氛围，不带任务
      this.npc.add('butterfly', { x: 4, z: -2 }, {
        task: null, name: '蝴蝶', id: 'npc_butterfly', flyHeight: 1.8
      });

      // ---------- 小星星 ----------
      this.star = new global.DDStarBuddy(this.scene, this.garden);

      // ---------- 宝箱 ----------
      this.chest = new global.DDTreasureChest(this.scene, this.garden);

      // ---------- 小游戏 ----------
      var MG = global.DDMiniGames;
      this.mg1 = new MG[1](this);
      this.mg2 = new MG[2](this);
      this.mg3 = new MG[3](this);
      this.mg4 = new MG[4](this);
      this.mg5 = new MG[5](this);

      // ---------- 任务系统 ----------
      this.tasks = new global.DDTaskManager(this);

      // ---------- 可点击对象表 ----------
      this.buildPickables();

      // ---------- 开场白 ----------
      this.ui.say('⭐', '你好呀！我们一起去帮助小动物吧！', 3600);
      this.ui.setTaskHint('🐰', '轻轻点一下小兔子试试看');
      this.idleTimer = 0;
      this.lastInteraction = performance.now();

      global.DDAudio.play('sparkle');
    },

    /**
     * 汇总所有可点击对象
     */
    buildPickables: function () {
      this.pickables = [];
      var i;
      // NPC
      if (this.npc) {
        for (i = 0; i < this.npc.npcs.length; i++) {
          this.pickables.push(this.npc.npcs[i].root);
        }
      }
      // 宝箱
      if (this.chest) this.pickables.push(this.chest.group);
      // 房子
      if (this.garden && this.garden.houseGroup) this.pickables.push(this.garden.houseGroup);
      // 小游戏里的可收集物。
      // 注意：mg1 的胡萝卜是任务开始时动态生成的，
      // 这里必须过滤掉「已不可见 / 已拾取」的，否则点不到新生成的。
      var mgRoots = [];
      var mgs = [this.mg1, this.mg2, this.mg5];
      for (i = 0; i < mgs.length; i++) {
        if (!mgs[i] || !mgs[i].group || !mgs[i].group.visible) continue;
        var arr = mgs[i].carrots || mgs[i].flowers || mgs[i].gems;
        if (!arr) continue;
        for (var j = 0; j < arr.length; j++) {
          if (arr[j].visible && !arr[j].userData.picked) mgRoots.push(arr[j]);
        }
      }
      for (i = 0; i < mgRoots.length; i++) this.pickables.push(mgRoots[i]);
      // 重要：给每个可收集物的所有子 mesh 打上 mgRoot 标记，
      // 这样射线命中任何一层都能追溯到它所属的容器。
      // 注意：NPC、房子、宝箱有自己的标记，不能被覆盖成 mgRoot。
      mgRoots.forEach(function (root) {
        root.traverse(function (o) {
          if (o.isMesh) {
            o.userData.mgRoot = root;
            o.userData.kind = o.userData.kind || 'item';
          }
        });
      });

      // NPC 的子 mesh 标记 npcRoot（npc.js 里已做，这里做双保险）
      if (this.npc) {
        this.npc.npcs.forEach(function (n) {
          n.root.traverse(function (o) {
            if (o.isMesh) o.userData.npcRoot = n.root;
          });
        });
      }
    },

    /* =======================================================
     * 屏幕点击 → 世界拾取
     * ======================================================= */
    onScreenTap: function () {
      // 只有 PLAYING / MINIGAME 状态响应场景点击
      if (this.state !== 'PLAYING' && this.state !== 'MINIGAME') return;

      var self = this;
      this.idleTimer = 0;
      this.lastInteraction = performance.now();

      // 1) 先检测是否点到可交互对象（NPC / 物品 / 宝箱 / 房子）
      this.raycaster.setFromCamera(this.pointer, this.camera);
      var hits = this.raycaster.intersectObjects(this.pickables, true);

      if (hits.length > 0) {
        var hitObj = hits[0].object;
        var data = hitObj.userData || {};

        // ---- 宝箱 ----
        if (data.kind === 'chest') {
          this.onChestTap();
          return;
        }

        // ---- NPC ----
        if (data.npcRoot) {
          this.onNPCTap(data.npcRoot);
          return;
        }

        // ---- 小游戏收集物 ----
        if (data.mgRoot) {
          this.onItemTap(data.mgRoot);
          return;
        }

        // ---- 房子（走过去看看） ----
        if (data.kind === 'house') {
          this.walkTo(this.garden.housePos.x, this.garden.housePos.z - 5.5);
          this.ui.say('⭐', '这是小动物的家呀～', 2400);
          return;
        }
      }

      // 2) 点地面 → 走过去
      this.walkToGround();
    },

    /**
     * 点击 NPC：自动走近 + 打招呼
     */
    onNPCTap: function (npcRoot) {
      var npc = null;
      for (var i = 0; i < this.npc.npcs.length; i++) {
        if (this.npc.npcs[i].root === npcRoot) { npc = this.npc.npcs[i]; break; }
      }
      if (!npc) return;

      // 蝴蝶只是氛围角色，不触发任务
      if (npc.task === null || npc.task === undefined) {
        var d = npc.root.position.distanceTo(this.player.pos);
        this.walkTo(npc.root.position.x, npc.root.position.z + 1.8);
        this.ui.say('🦋', '蝴蝶说：你好呀！', 2200);
        global.DDAudio.play('chirp');
        return;
      }

      // 走到 NPC 身边
      var tx = npc.root.position.x;
      var tz = npc.root.position.z + 2.2;
      this.walkTo(tx, tz);
      global.DDAudio.play(npc.kind === 'cat' ? 'meow' : (npc.kind === 'rabbit' ? 'squeak' : 'moo'));

      // 触发打招呼动画
      npc.greetTimer = 1.6;
      npc.greeted = true;

      // 镜头稍微拉近
      this.player.zoomIn();
      var self = this;
      setTimeout(function () { self.player.zoomOut(); }, 1800);

      // 判断这个任务的状态
      var task = this.tasks.get(npc.task);
      if (!task) return;

      if (this.tasks.completed[npc.task]) {
        // 已完成 → 只是 Friendly 回应
        this.ui.say('⭐', task.icon + ' ' + this.friendlyLine(npc.kind, task), 2800);
        return;
      }

      // 还没做，且当前没有别的任务在进行 → 开始
      if (!this.tasks.activeTask) {
        var d2 = npc.root.position.distanceTo(this.player.pos);
        // 玩家已经走到附近才真正开始（避免点一下就立刻开始、角色还在远处）
        if (d2 < 4.5) {
          this.beginTask(npc.task);
        } else {
          // 先走过去，到了再开始
          var self2 = this;
          this.pendingTask = npc.task;
          var check = setInterval(function () {
            if (self2.state === 'PLAYING' &&
                self2.player.pos.distanceTo(npc.root.position) < 4.2) {
              clearInterval(check);
              self2.pendingTask = null;
              self2.beginTask(npc.task);
            } else if (self2.state !== 'PLAYING' && self2.state !== 'MINIGAME') {
              clearInterval(check);
              self2.pendingTask = null;
            }
          }, 120);
        }
      }
    },

    /** 已完成任务后 NPC 说的话 */
    friendlyLine: function (kind, task) {
      var lines = {
        carrot: '谢谢你呀，我吃饱啦！',
        redFlower: '那朵红花真好看对不对？',
        countDuck: '小鸭子们玩得好开心！',
        catHome: '我又可以睡懒觉啦～',
        rainbowGem: '彩虹好漂亮！'
      };
      return lines[task.id] || '我们下次再玩呀！';
    },

    /**
     * 点击收集物
     */
    onItemTap: function (mgRoot) {
      var handled = false;
      var state = this.state;

      if (state === 'MINIGAME') {
        // 当前小游戏尝试消费这次点击
        var mg = mgRoot.userData.mg;
        if (mg === 'carrot' && this.mg1.active) handled = this.mg1.onPick(mgRoot);
        else if (mg === 'redFlower' && this.mg2.active) handled = this.mg2.onPick(mgRoot);
        else if (mg === 'rainbowGem' && this.mg5.active) handled = this.mg5.onPick(mgRoot);
      }

      if (!handled) {
        // 不是当前任务的东西 → 走过去看看（不惩罚）
        this.walkTo(mgRoot.position.x, mgRoot.position.z + 1.6);
      }
    },

    /**
     * 点击宝箱
     */
    onChestTap: function () {
      if (!this.chest || !this.chest.group.visible) return;
      this.walkTo(this.chest.group.position.x, this.chest.group.position.z + 2.6);
      this.openChest();
    },

    /**
     * 走到地面某点
     */
    walkToGround: function () {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      var point = new THREE.Vector3();
      // 用无限远的水平面求交
      if (this.raycaster.ray.intersectPlane(this.groundPlane, point)) {
        this.walkTo(point.x, point.z);
        // 落点特效：轻轻一圈光
        this.fx.ring(new THREE.Vector3(point.x, 0, point.z), 0xffffff);
      }
    },

    /**
     * 走位（内部做安全检查，保证不会走到水里/出界）
     */
    walkTo: function (x, z) {
      if (!this.player) return;
      var r = this.garden.radius - 2.6;
      var d = Math.hypot(x, z);
      if (d > r) { x = x / d * r; z = z / d * r; }
      this.player.moveTo(x, z);
      this.idleTimer = 0;
    },

    /* =======================================================
     * 任务控制
     * ======================================================= */
    /**
     * 镜头看向某点（小游戏用：让孩子先看清目标再作答）
     * @param {THREE.Vector3} pos
     * @param {number} zoom
     * @param {number} dur 毫秒
     */
    focusOn: function (pos, zoom, dur) {
      if (this.player) this.player.focusOn(pos, zoom, dur);
    },

    focusOff: function () {
      if (this.player) this.player.focusOff();
    },

    beginTask: function (taskId) {
      if (!this.tasks) return;
      var ok = this.tasks.begin(taskId);
      if (ok) {
        var t = this.tasks.activeTask;
        // 小游戏可能动态生成可收集物（如胡萝卜按小兔子位置现场生成），
        // 所以每次开任务都要重建可点击列表，否则新生成的胡萝卜点不到。
        this.buildPickables();
        this.ui.say('⭐', t.intro, 3400);
        this.player.zoomIn();
        var self = this;
        setTimeout(function () { self.player.zoomOut(); }, 2000);
      }
    },

    /**
     * 任务完成 → 加星 + 检查是否集齐
     */
    onTaskComplete: function (task) {
      var self = this;
      this.state = 'PLAYING';

      // 清理本次任务动态生成的可收集物。
      // 必须在状态切回 PLAYING 之前做：finish() 里的数组可能和场景实际对象
      // 不同步（任务被提前结束等），靠 userData 标记兜底扫一遍最稳。
      this.purgeMinigameObjects();

      // 加星
      var stars = global.DDSave.addStar();
      this.ui.setStars(stars, 5);
      this.ui.popStar();
      global.DDAudio.play('star');
      global.DDSave.markTask(task.id);

      // 教育目标记录
      if (task.eduType === 'colors') global.DDSave.data.colorEduDone = true;
      if (task.eduType === 'numbers') global.DDSave.data.numberEduDone = true;
      global.DDSave.save();

      // 彩带特效
      this.fx.rain(this.player.pos.x, this.player.pos.z, 20);
      this.player.jump();
      this.npc.celebrate();

      // 清除任务提示
      this.ui.hideTaskHint();
      this.ui.hideChoices();

      // 小星星表扬
      var self2 = this;
      global.DDAICompanion.say('praise', { task: task.id }).then(function (line) {
        self2.ui.say('⭐', line + ' 得到一颗魔法星星！', 3000);
      });

      // 判断下一个任务
      var next = this.tasks.nextTask();
      if (next) {
        setTimeout(function () {
          self2.ui.setTaskHint(next.icon, '去帮' + next.title.replace(/^帮/, '') + '吧');
        }, 2600);
      } else {
        // 5 个都做完了 → 去拿宝箱
        setTimeout(function () { self2.onAllTasksDone(); }, 2200);
      }
    },

    /**
     * 集齐 5 个小游戏 → 出现彩虹 + 宝箱
     */
    onAllTasksDone: function () {
      var self = this;
      this.state = 'REWARD';

      // 彩虹
      var rb = this.garden.bigRainbow;
      if (rb && !rb.visible) {
        rb.visible = true;
        var t0 = performance.now();
        (function grow() {
          var k = Math.min(1, (performance.now() - t0) / 2000);
          var e = 1 - Math.pow(1 - k, 4);
          rb.scale.setScalar(0.001 + e);
          if (k < 1) requestAnimationFrame(grow);
        })();
      }

      // 动物们庆祝
      this.npc.celebrate();
      this.fx.rain(this.player.pos.x, this.player.pos.z, 34);

      // 出现宝箱
      this.chest.show();
      this.ui.say('⭐', '哇！宝箱出现了！快去打开它！', 3600);
      this.ui.setTaskHint('🎁', '去打开魔法宝箱吧');

      // 小星星带路到宝箱
      this.star.guideTo({
        x: this.chest.group.position.x, y: 0, z: this.chest.group.position.z
      }, 3.5);

      global.DDAudio.play('rainbow');
    },

    /**
     * 打开宝箱 → 获得奖励 → 结算
     */
    openChest: function () {
      var self = this;
      if (!this.chest || this.chest.opened) return;

      this.player.zoomIn();
      this.fx.burst(
        { x: this.chest.group.position.x, y: 2.5, z: this.chest.group.position.z },
        26, [0xffd75e, 0xfff3a0, 0xffffff, 0xff9ec4], 1.4
      );

      this.chest.open(function () {
        var reward = global.DDSave.getRandomReward();
        global.DDSave.addReward(reward.id);
        self.fx.rain(self.player.pos.x, self.player.pos.z, 24);

        self.ui.showReward(reward, function () {
          self.state = 'FINISHED';
          self.ui.showHud(false);
          self.ui.hideTaskHint();
          self.ui.hideSay();
          self.player.zoomOut();
          self.npc.celebrate();
          self.ui.showFinish('🎁 获得奖励：' + reward.emoji + ' ' + reward.name);
        });
      });
    },

    /**
     * 清理场景里所有小游戏动态生成的可收集物
     *
     * 这些对象（胡萝卜 / 花 / 宝石）是在任务开始时按当时的场景位置现场生成的，
     * 不像静态景物那样一开始就固定存在。如果只依赖各游戏的 finish() 去清，
     * 一旦数组和场景不同步就会漏掉，表现为"再玩一次"后
     * 场景里攒了 6 根胡萝卜、10 颗宝石，显存和 draw calls 持续上涨。
     *
     * 所以这里按 userData.mg 标记兜底扫一遍整个场景。
     */
    purgeMinigameObjects: function () {
      var mgTags = ['carrot', 'redFlower', 'rainbowGem', 'duck'];
      // 先把要删的对象收集到一个列表里，再统一移除。
      //
      // 关键：不能在 traverse 回调里直接改 this.mg1.carrots 这类数组。
      // 那些对象本身就是数组的元素，遍历中移除会让数组边变边读，
      // 触发 "Cannot read properties of undefined (reading 'traverse')"，
      // 而且会漏删一半对象。
      var doomed = [];
      this.scene.traverse(function (o) {
        if (o.userData && mgTags.indexOf(o.userData.mg) >= 0) {
          doomed.push(o);
        }
      });
      var removed = 0;
      for (var i = 0; i < doomed.length; i++) {
        if (!doomed[i].parent) continue;
        // 必须显式 dispose：从场景树里 remove 只断开引用，
        // 不会释放 GPU 侧的 geometry/texture。
        // 不 dispose 的话 renderer.info.memory.geometries 会一轮一轮往上涨
        //（实测 290 → 429 → 508），长时间玩必然显存吃紧、掉帧。
        doomed[i].traverse(function (c) {
          if (c.geometry && c.geometry.dispose) c.geometry.dispose();
          if (c.material) {
            if (Array.isArray(c.material)) {
              c.material.forEach(function (m) { if (m.dispose) m.dispose(); });
            } else if (c.material.dispose) {
              c.material.dispose();
            }
          }
        });
        doomed[i].parent.remove(doomed[i]);
        removed++;
      }
      // 现在可以安全清空引用了
      if (this.mg1) { this.mg1.carrots = []; this.mg1.found = 0; }
      if (this.mg2) { this.mg2.flowers = []; this.mg2.done = false; }
      if (this.mg5) { this.mg5.gems = []; this.mg5.found = 0; }
      if (removed > 0) {
        console.log('[清理] 移除小游戏对象 ' + removed + ' 个');
      }
    },

    /**
     * 重新开始（保留奖励，清空任务）
     */
    restart: function (keepRewards) {
      var self = this;
      this.state = 'PLAYING';

      // 清空任务完成记录
      this.tasks.completed = {};
      this.tasks.activeTask = null;
      global.DDSave.data.tasksDone = [];
      global.DDSave.data.stars = 0;
      global.DDSave.data.colorEduDone = false;
      global.DDSave.data.numberEduDone = false;
      global.DDSave.save();
      this.ui.setStars(0, 5);

      // 重置小游戏
      this.mg1.finish(); this.mg2.finish(); this.mg3.finish();
      this.mg4.finish(); this.mg5.finish();
      // 动态生成的可收集物要额外做一次"深度清理"。
      // 为什么 finish() 里已经清理了还要再来一遍：
      // finish() 依赖 this.carrots / this.flowers / this.gems 数组，
      // 而这些数组在某些路径（比如任务被 done() 提前结束、或者中途切状态）
      // 可能和场景里的实际对象不同步，导致漏掉一部分。
      // purgeAll() 是兜底：直接按 userData.mg 标记遍历整个场景清一遍，
      // 保证「再玩一次」后场景对象数不会一轮一轮往上涨。
      this.purgeMinigameObjects();
      this.mg1.found = 0;
      this.mg5.found = 0;
      this.mg2.done = false;
      this.mg3.active = false;
      this.mg4.active = false; this.mg4.following = false; this.mg4.done = false;

      // 宝箱收起来
      this.chest.group.visible = false;
      this.chest.opened = false;
      this.chest.lid.rotation.x = 0;

      // 彩虹收起来
      if (this.garden.bigRainbow) {
        this.garden.bigRainbow.visible = false;
        this.garden.bigRainbow.scale.setScalar(0.001);
      }

      // 放回小猫
      var cat = this.npc.find('cat');
      if (cat) {
        cat.locked = false;
        cat.root.visible = true;
        cat.root.position.set(10, 0, 8);
        cat.root.position.y = 0;
        cat.greeted = false;
      }

      // 重置任务完成状态（NPC 重新能打招呼）
      this.npc.npcs.forEach(function (n) { n.greeted = false; });

      // 玩家回到出生点
      this.player.pos.set(0, 0, 14);
      this.player.target.set(0, 0, 14);

      this.ui.showHud(true);
      this.ui.say('⭐', '我们再玩一次吧！', 2800);
      this.ui.setTaskHint('🐰', '去帮小兔子找胡萝卜吧');
    },

    /**
     * "去花园玩"：不重置任务，自由逛
     */
    freePlay: function () {
      this.state = 'PLAYING';
      this.ui.showHud(true);
      this.ui.say('⭐', '想玩什么都可以点一点哦～', 3200);
      this.ui.setTaskHint('🌷', '点一点小动物玩吧');

      // 自由玩：宝箱可以再开一次
      this.chest.opened = false;
      this.chest.group.visible = true;
      this.chest.lid.rotation.x = 0;
    },

    /* =======================================================
     * 无操作 10 秒 → 引导
     * ======================================================= */
    updateIdleHint: function (dt) {
      if (this.state !== 'PLAYING' && this.state !== 'MINIGAME') return;

      this.idleTimer += dt;
      if (this.idleTimer < 10) return;
      this.idleTimer = 0;   // 每 10 秒最多触发一次

      // 小星星说句话
      var self = this;
      // 优先用小游戏的专门提示
      var hintText = null;
      if (this.tasks && this.tasks.activeTask) {
        hintText = this.tasks.activeTask.hint;
      } else if (this.tasks) {
        var next = this.tasks.nextTask();
        if (next) hintText = next.hint || '去看看小动物吧';
      }

      // 找到目标位置，让小星星飞过去
      var targetPos = null;
      if (this.tasks && this.tasks.activeTask) {
        // 进行中：指向当前任务的相关 NPC
        var t = this.tasks.activeTask;
        var n = this.npc.findByTask(t.id);
        if (n) targetPos = n.root.position.clone();
      } else if (this.tasks) {
        var nt = this.tasks.nextTask();
        if (nt) {
          var n2 = this.npc.findByTask(nt.id);
          if (n2) targetPos = n2.root.position.clone();
        }
      }
      if (this.state === 'REWARD' || (this.chest && this.chest.group.visible && !this.chest.opened)) {
        targetPos = this.chest.group.position.clone();
        hintText = '去打开宝箱呀！';
      }

      // 小星星飞过去
      if (targetPos) {
        this.star.guideTo(targetPos, 2.8);
        this.fx.burst(targetPos.clone().setY(2.4), 10, [0xfff3a0, 0xffffff], 0.8);
        global.DDAudio.play('sparkle');
      }

      // 说话
      global.DDAICompanion.say('guide', {}).then(function (line) {
        self.ui.say('⭐', line, 3000);
      });

      // 让所有 NPC 挥手
      if (this.npc) {
        for (var i = 0; i < this.npc.npcs.length; i++) {
          if (this.npc.npcs[i].kind !== 'butterfly') {
            this.npc.npcs[i].greetTimer = 1.4;
            this.npc.npcs[i].greeted = true;
          }
        }
      }
    },

    /* =======================================================
     * 窗口尺寸
     * ======================================================= */
    onResize: function () {
      var w = global.innerWidth, h = global.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setPixelRatio(this.getPixelRatio());
      this.renderer.setSize(w, h);
      // 转屏后重新计算相机距离（竖屏/横屏用不同偏移）
      if (this.player) this.player.camOffset.copy(this.getCamOffsetForScreen());
    },

    /* =======================================================
     * 主循环
     * ======================================================= */
    loop: function (now) {
      var self = this;
      requestAnimationFrame(function (t) { self.loop(t); });

      // 计算 delta（限制最大 0.05 秒，避免切回页面时瞬移）
      var dt = (now - this.lastFrame) / 1000;
      if (dt > 0.05) dt = 0.05;
      if (dt < 0) dt = 0;
      this.lastFrame = now;

      // 世界动画（云、花、气球、水波）
      this.world.update(dt);

      if (this.started) {
        // 玩家
        this.player.update(dt);
        // 阴影相机跟着玩家（地图扩大后必须，否则远处没有影子）
        this.world.updateShadowFollow(this.player.pos);
        // NPC
        this.npc.update(dt, this.player.pos);
        // 小星星
        this.star.update(dt, this.player.pos);
        // 任务
        if (this.state === 'MINIGAME') this.tasks.update(dt);
        // 特效
        this.fx.update(dt);
        // 宝箱
        this.chest.update(dt);

        // 累计时长（每 5 秒写一次盘，减少存储压力）
        this.playTimeAcc += dt;
        if (this.playTimeAcc >= 5) {
          global.DDSave.addPlayTime(this.playTimeAcc);
          this.playTimeAcc = 0;
        }

        // 无操作引导
        this.updateIdleHint(dt);
      } else if (this.previewPlayer) {
        // 首页：让预览角色慢慢转圈
        this.previewPlayer.update(dt);
        this.previewPlayer.faceAngle += dt * 0.25;
        this.fx.update(dt);
      }

      // 渲染
      this.renderer.render(this.scene, this.camera);
    }
  };

  /* ===========================================================
   * 全局错误捕获：开发期把错误显示出来，方便排查
   * =========================================================== */
  global.addEventListener('error', function (ev) {
    var msg = '❌ ' + ev.message + '\n   ' +
      (ev.filename || '').split('/').pop() + ':' + ev.lineno;
    console.error('[游戏错误]', ev.error || ev.message);
    if (global.DDUI) global.DDUI.showError(msg);
  });

  global.addEventListener('unhandledrejection', function (ev) {
    console.error('[未处理的 Promise]', ev.reason);
  });

  /* ===========================================================
   * 启动！
   * =========================================================== */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { Game.boot(); });
  } else {
    Game.boot();
  }

  global.DDGame = Game;
})(window);
