/* ===========================================================
 * ui.js —— 所有界面元素的操作
 *  - 对话气泡
 *  - 屏幕下半部分的巨大选择按钮
 *  - 任务提示条
 *  - 星星计数
 *  - 声音开关
 *  - 家长模式（长按齿轮 1.6 秒，防误触）
 *  - 奖励弹层 / 结算页
 * =========================================================== */
(function (global) {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var UI = {
    bubbleTimer: null,
    taskTimer: null,
    gearPressTimer: null,
    gearPressStart: 0,

    /** 缓存 DOM */
    init: function () {
      this.el = {
        hud: $('hud'),
        bubble: $('bubble'),
        bubbleAvatar: $('bubble-avatar'),
        bubbleText: $('bubble-text'),
        choices: $('choices'),
        taskHint: $('task-hint'),
        taskIcon: $('task-hint-icon'),
        taskText: $('task-hint-text'),
        starText: $('star-text'),
        starCounter: $('star-counter'),
        soundBtn: $('btn-sound'),
        soundIcon: $('sound-icon'),
        gear: $('btn-gear'),
        gearProgress: $('gear-progress'),
        screenLogo: $('screen-logo'),
        screenSelect: $('screen-select'),
        screenFinish: $('screen-finish'),
        rewardModal: $('reward-modal'),
        parentModal: $('parent-modal'),
        loading: $('loading'),
        errorBox: $('error-box'),
        finishReward: $('finish-reward-box')
      };
      this.bindGear();
    },

    /* ---------- 加载层 ---------- */
    hideLoading: function () {
      var l = this.el.loading;
      if (!l) return;
      l.classList.add('gone');
      setTimeout(function () { l.classList.add('hidden'); }, 600);
    },

    /* ---------- 对话气泡 ---------- */
    /**
     * 显示一句话
     * @param {string} avatar 表情符号
     * @param {string} text 文字
     * @param {number} dur 持续毫秒
     */
    say: function (avatar, text, dur) {
      var e = this.el;
      if (!e.bubble) return;
      e.bubbleAvatar.textContent = avatar || '⭐';
      e.bubbleText.textContent = text;
      e.bubble.classList.remove('hidden');
      // 重放入场动画
      e.bubble.style.animation = 'none';
      void e.bubble.offsetWidth;
      e.bubble.style.animation = '';

      if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
      var self = this;
      this.bubbleTimer = setTimeout(function () {
        e.bubble.classList.add('hidden');
      }, dur || 2600);
    },

    hideSay: function () {
      if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
      if (this.el.bubble) this.el.bubble.classList.add('hidden');
    },

    /* ---------- 巨大选择按钮 ---------- */
    /**
     * 显示一组巨大按钮
     * @param {Array} items [{label|emoji, className, onClick}]
     */
    showChoices: function (items) {
      var box = this.el.choices;
      if (!box) return;
      box.innerHTML = '';
      box.classList.remove('hidden');
      // 通知 CSS：把对话气泡抬到按钮上方，避免遮挡
      document.body.classList.add('has-choices');

      for (var i = 0; i < items.length; i++) {
        this.makeChoiceBtn(box, items[i]);
      }
    },

    /**
     * 生成一个巨大按钮
     *
     * 注意：这里必须用独立函数 + 参数传递来绑定点击回调。
     * 如果在 for 循环里用 var 声明再被闭包捕获，所有按钮都会拿到
     * 「最后一个」item 的回调（经典的 var 闭包陷阱），
     * 表现为点"2"却执行了"3"的逻辑。
     *
     * @param {HTMLElement} box 容器
     * @param {object} it {label|emoji, className, fontSize, onClick}
     */
    makeChoiceBtn: function (box, it) {
      var btn = document.createElement('button');
      btn.className = 'choice-btn' + (it.className ? ' ' + it.className : '');
      btn.textContent = (it.emoji ? it.emoji : it.label);
      if (it.fontSize) btn.style.fontSize = it.fontSize;

      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        global.DDAudio.play('click');
        if (it.onClick) it.onClick(btn);
      });
      box.appendChild(btn);
      return btn;
    },

    hideChoices: function () {
      var box = this.el.choices;
      if (!box) return;
      box.classList.add('hidden');
      box.innerHTML = '';
      document.body.classList.remove('has-choices');
    },

    /* ---------- 任务提示条 ---------- */
    setTaskHint: function (icon, text) {
      var e = this.el;
      if (!e.taskHint) return;
      e.taskIcon.textContent = icon || '⭐';
      e.taskText.textContent = text || '';
      e.taskHint.classList.remove('hidden');
    },

    hideTaskHint: function () {
      if (this.el.taskHint) this.el.taskHint.classList.add('hidden');
    },

    /* ---------- 星星计数 ---------- */
    setStars: function (n, total) {
      if (!this.el.starText) return;
      this.el.starText.textContent = (n || 0) + '/' + (total || 5);
    },

    popStar: function () {
      var e = this.el.starCounter;
      if (!e) return;
      e.classList.remove('pop');
      void e.offsetWidth;
      e.classList.add('pop');
    },

    /* ---------- HUD 显隐 ---------- */
    showHud: function (v) {
      if (this.el.hud) this.el.hud.classList.toggle('hidden', !v);
    },

    /* ---------- 声音开关 ---------- */
    setSoundIcon: function (on) {
      if (this.el.soundIcon) this.el.soundIcon.textContent = on ? '🔊' : '🔇';
    },

    /* ---------- 页面切换 ---------- */
    showScreen: function (name) {
      var e = this.el;
      ['screenLogo', 'screenSelect', 'screenFinish'].forEach(function (k) {
        if (e[k]) e[k].classList.add('hidden');
      });
      if (name === 'logo') e.screenLogo.classList.remove('hidden');
      else if (name === 'select') e.screenSelect.classList.remove('hidden');
      else if (name === 'finish') e.screenFinish.classList.remove('hidden');
    },

    hideScreens: function () {
      this.showScreen(null);
    },

    /* ---------- 奖励弹层 ---------- */
    /**
     * 显示奖励
     * @param {object} reward {emoji, name, desc}
     * @param {function} onOk 点击"收下啦"
     */
    showReward: function (reward, onOk) {
      var e = this.el;
      $('reward-emoji').textContent = reward.emoji;
      $('reward-name').textContent = reward.name;
      $('reward-desc').textContent = reward.desc;
      e.rewardModal.classList.remove('hidden');

      var self = this;
      var btn = $('btn-reward-ok');
      // 每次重新绑定，避免重复叠加监听
      btn.onclick = function () {
        global.DDAudio.play('click');
        e.rewardModal.classList.add('hidden');
        if (onOk) onOk();
      };
    },

    /* ---------- 结算页 ---------- */
    showFinish: function (rewardText) {
      var e = this.el;
      if (e.finishReward) e.finishReward.textContent = rewardText || '';
      e.screenFinish.classList.remove('hidden');
    },

    /* ---------- 家长模式：长按齿轮 ---------- */
    bindGear: function () {
      var self = this;
      var gear = this.el.gear;
      var prog = this.el.gearProgress;
      if (!gear) return;

      var HOLD_MS = 1600;   // 需要长按 1.6 秒，防止儿童误触

      function begin() {
        if (self.gearPressTimer) return;
        self.gearPressStart = performance.now();
        var t0 = self.gearPressStart;
        // 进度条动画
        function tick() {
          var k = Math.min(1, (performance.now() - t0) / HOLD_MS);
          prog.style.width = (k * 100) + '%';
          if (k >= 1) {
            end(true);
          } else {
            self.gearPressTimer = requestAnimationFrame(tick);
          }
        }
        self.gearPressTimer = requestAnimationFrame(tick);
      }

      function end(fire) {
        if (self.gearPressTimer) {
          cancelAnimationFrame(self.gearPressTimer);
          self.gearPressTimer = null;
        }
        prog.style.width = '0%';
        if (fire) {
          global.DDAudio.play('correct');
          self.openParent();
        }
      }

      gear.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        begin();
      });
      gear.addEventListener('pointerup', function (ev) { ev.stopPropagation(); end(false); });
      gear.addEventListener('pointercancel', function () { end(false); });
      gear.addEventListener('pointerleave', function () { end(false); });
      gear.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
    },

    /* ---------- 家长中心 ---------- */
    openParent: function () {
      var Save = global.DDSave;
      var data = Save.data;
      var minutes = Math.floor((data.todaySeconds || 0) / 60);
      $('p-time').textContent = minutes;
      $('p-tasks').textContent = (data.tasksDone || []).length;
      $('p-color').textContent = data.colorEduDone ? '已完成 ✓' : '未完成';
      $('p-number').textContent = data.numberEduDone ? '已完成 ✓' : '未完成';
      this.el.parentModal.classList.remove('hidden');

      var self = this;
      $('btn-parent-close').onclick = function () {
        global.DDAudio.play('click');
        self.el.parentModal.classList.add('hidden');
      };
      $('btn-parent-reset').onclick = function () {
        global.DDAudio.play('gentle');
        Save.reset();
        $('p-time').textContent = 0;
        $('p-tasks').textContent = 0;
        $('p-color').textContent = '未完成';
        $('p-number').textContent = '未完成';
      };
    },

    /* ---------- 错误提示（仅开发期） ---------- */
    showError: function (msg) {
      var box = this.el.errorBox;
      if (!box) return;
      box.classList.remove('hidden');
      box.textContent = (box.textContent ? box.textContent + '\n' : '') + msg;
    }
  };

  global.DDUI = UI;
})(window);
