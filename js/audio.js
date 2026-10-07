/* ===========================================================
 * audio.js —— 全部声音由 WebAudio 实时合成，不依赖任何外部音频文件
 * 儿童向要求：音量柔和，无刺耳高频，所有音效都是"好听"的
 * =========================================================== */
(function (global) {
  'use strict';

  var AudioMod = {
    ctx: null,          // AudioContext
    master: null,       // 总音量节点
    musicGain: null,    // 背景音乐音量节点
    sfxGain: null,      // 音效音量节点
    enabled: true,      // 声音总开关
    musicOn: true,      // 音乐开关
    started: false,     // 是否已经解锁（浏览器要求用户手势后才能播放）
    _musicTimer: null,  // 背景音乐定时器
    _stepFlag: false,   // 走路音效交替
    _lastStepTime: 0
  };

  /* ---------- 初始化：必须在用户点击之后调用 ---------- */
  AudioMod.init = function () {
    if (AudioMod.started) return true;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) {
      // 极老设备不支持 WebAudio：静默降级，游戏照常可玩
      console.warn('[音频] 当前浏览器不支持 WebAudio，已静音降级');
      AudioMod.started = true;
      AudioMod.enabled = false;
      return false;
    }
    try {
      AudioMod.ctx = new AC();
    } catch (e) {
      console.warn('[音频] AudioContext 创建失败', e);
      AudioMod.started = true;
      AudioMod.enabled = false;
      return false;
    }

    AudioMod.master = AudioMod.ctx.createGain();
    AudioMod.master.gain.value = 0.5;          // 总音量压低，保护儿童听力
    AudioMod.master.connect(AudioMod.ctx.destination);

    AudioMod.musicGain = AudioMod.ctx.createGain();
    AudioMod.musicGain.gain.value = 0.26;
    AudioMod.musicGain.connect(AudioMod.master);

    AudioMod.sfxGain = AudioMod.ctx.createGain();
    AudioMod.sfxGain.gain.value = 0.62;
    AudioMod.sfxGain.connect(AudioMod.master);

    AudioMod.started = true;
    return true;
  };

  /* iOS/部分安卓需要 resume 才能出声 */
  AudioMod.resume = function () {
    if (!AudioMod.ctx) return;
    if (AudioMod.ctx.state === 'suspended') {
      AudioMod.ctx.resume();
    }
  };

  /* ---------- 基础音符 ---------- */
  /**
   * 播放一个音符
   * @param {number} freq  频率（Hz）
   * @param {number} start 相对当前时间的延迟（秒）
   * @param {number} dur   时长（秒）
   * @param {string} type  波形：sine/triangle/square
   * @param {number} vol   音量 0~1
   * @param {number} dest  目标节点，默认走音效通道
   */
  AudioMod.tone = function (freq, start, dur, type, vol, dest) {
    if (!AudioMod.enabled || !AudioMod.ctx) return;
    var ctx = AudioMod.ctx;
    var t0 = ctx.currentTime + (start || 0);

    var osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);

    // 柔和的音量包络：快速起音、缓慢释放，避免爆音（click/pop）
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g);
    g.connect(dest || AudioMod.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  };

  /**
   * 播放一段滑音（用于"找到啦""正确"这类上扬感觉）
   */
  AudioMod.slide = function (f1, f2, start, dur, type, vol) {
    if (!AudioMod.enabled || !AudioMod.ctx) return;
    var ctx = AudioMod.ctx;
    var t0 = ctx.currentTime + (start || 0);

    var osc = ctx.createOscillator();
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(f1, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);

    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g);
    g.connect(AudioMod.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  };

  /* ---------- 音效库 ---------- */
  var SFX = {
    // 点击按钮：清脆的"叮"
    click: function () {
      AudioMod.tone(880, 0, 0.16, 'sine', 0.30);
      AudioMod.tone(1320, 0.02, 0.14, 'sine', 0.16);
    },

    // 收集到物品：三个上行音
    collect: function () {
      AudioMod.tone(784, 0, 0.13, 'triangle', 0.34);
      AudioMod.tone(988, 0.08, 0.13, 'triangle', 0.32);
      AudioMod.tone(1319, 0.16, 0.24, 'triangle', 0.30);
    },

    // 获得魔法星星：更长的上行琶音 + 高音铃
    star: function () {
      var seq = [523, 659, 784, 1047, 1319];
      for (var i = 0; i < seq.length; i++) {
        AudioMod.tone(seq[i], i * 0.085, 0.34, 'triangle', 0.30);
      }
      AudioMod.tone(2093, 0.44, 0.7, 'sine', 0.16);
    },

    // 答对：明亮的两音
    correct: function () {
      AudioMod.tone(659, 0, 0.16, 'sine', 0.32);
      AudioMod.tone(988, 0.11, 0.34, 'sine', 0.30);
    },

    // 答错/再试试：柔和的下行两音，绝不刺耳
    gentle: function () {
      AudioMod.tone(523, 0, 0.18, 'sine', 0.24);
      AudioMod.tone(392, 0.13, 0.34, 'sine', 0.22);
    },

    // 任务完成：一小段欢快旋律
    taskDone: function () {
      var seq = [523, 587, 659, 784, 880, 1047];
      for (var i = 0; i < seq.length; i++) {
        AudioMod.tone(seq[i], i * 0.1, 0.4, 'triangle', 0.28);
      }
      AudioMod.tone(1568, 0.62, 0.9, 'sine', 0.14);
    },

    // 走路：极轻的"哒"（靠滤波后的噪声模拟软脚步）
    step: function () {
      if (!AudioMod.enabled || !AudioMod.ctx) return;
      var ctx = AudioMod.ctx;
      var t0 = ctx.currentTime;

      // 生成一小段白噪声
      var len = Math.floor(ctx.sampleRate * 0.07);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) {
        // 快速衰减的噪声
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
      var src = ctx.createBufferSource();
      src.buffer = buf;

      // 低通滤波，把噪声变成"软软的脚步声"
      var flt = ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = 420;

      var g = ctx.createGain();
      g.gain.value = 0.10;

      src.connect(flt);
      flt.connect(g);
      g.connect(AudioMod.sfxGain);
      src.start(t0);
    },

    // 动物叫声：用不同波形区分
    meow: function () {          // 小猫
      AudioMod.slide(720, 420, 0, 0.34, 'triangle', 0.26);
      AudioMod.tone(520, 0.3, 0.28, 'sine', 0.18);
    },
    squeak: function () {        // 小兔子
      AudioMod.slide(980, 1450, 0, 0.14, 'sine', 0.24);
      AudioMod.slide(1300, 900, 0.14, 0.16, 'sine', 0.20);
    },
    moo: function () {           // 小鹿/小熊
      AudioMod.tone(300, 0, 0.5, 'sine', 0.24);
      AudioMod.slide(280, 190, 0.4, 0.4, 'sine', 0.18);
    },
    chirp: function () {         // 蝴蝶/小鸟
      AudioMod.tone(1400, 0, 0.1, 'sine', 0.18);
      AudioMod.tone(1800, 0.09, 0.1, 'sine', 0.16);
      AudioMod.tone(1500, 0.18, 0.12, 'sine', 0.14);
    },
    sparkle: function () {       // 星星闪光
      AudioMod.tone(1760, 0, 0.16, 'sine', 0.16);
      AudioMod.tone(2349, 0.06, 0.22, 'sine', 0.12);
    },

    // 宝箱开启
    chest: function () {
      AudioMod.slide(300, 900, 0, 0.5, 'triangle', 0.22);
      var seq = [659, 784, 988, 1319, 1568, 2093];
      for (var i = 0; i < seq.length; i++) {
        AudioMod.tone(seq[i], 0.42 + i * 0.09, 0.45, 'triangle', 0.26);
      }
    },

    // 彩虹出现
    rainbow: function () {
      var seq = [523, 587, 659, 698, 784, 880, 988, 1047, 1175, 1319, 1568, 2093];
      for (var i = 0; i < seq.length; i++) {
        AudioMod.tone(seq[i], i * 0.075, 0.6, 'sine', 0.22);
      }
    }
  };

  /**
   * 播放音效
   * @param {string} name SFX 里的名称
   */
  AudioMod.play = function (name) {
    if (!AudioMod.enabled) return;
    if (!AudioMod.started) AudioMod.init();
    if (!AudioMod.ctx) return;
    AudioMod.resume();
    var fn = SFX[name];
    if (fn) {
      try { fn(); } catch (e) { console.warn('[音频] 播放失败:' + name, e); }
    }
  };

  /* ---------- 背景音乐：木琴风格的循环旋律 ---------- */
  // 童话感的小调旋律（C 大调五声音阶），用 setInterval 循环调度
  var MELODY = [
    // [音名, 拍数]
    [523.25, 1], [659.25, 1], [783.99, 1], [659.25, 1],
    [587.33, 1], [698.46, 1], [880.00, 1], [698.46, 1],
    [659.25, 1], [783.99, 1], [1046.50, 1], [783.99, 1],
    [587.33, 1], [698.46, 1], [783.99, 1], [587.33, 1],
    [523.25, 1], [659.25, 1], [783.99, 1], [1046.50, 1],
    [880.00, 2], [783.99, 1], [659.25, 1],
    [587.33, 1], [659.25, 1], [587.33, 1], [523.25, 2]
  ];

  var MELODY_BASS = [
    [130.81, 4], [174.61, 4], [146.83, 4], [196.00, 4],
    [130.81, 4], [174.61, 4], [130.81, 4], [196.00, 4]
  ];

  var musicStep = 0;
  var musicBeat = 0.30;  // 每拍秒数（约 100 BPM）

  function scheduleBar() {
    if (!AudioMod.enabled || !AudioMod.musicOn || !AudioMod.ctx) return;
    var i;
    // 主旋律：木琴感用 triangle 波 + 快速释放
    var note = MELODY[musicStep % MELODY.length];
    AudioMod.tone(note[0], 0, note[1] * musicBeat * 0.9, 'triangle', 0.30, AudioMod.musicGain);
    // 加一层更轻的高八度，增加"叮叮当当"的童话感
    if (musicStep % 2 === 0) {
      AudioMod.tone(note[0] * 2, 0.02, note[1] * musicBeat * 0.5, 'sine', 0.10, AudioMod.musicGain);
    }
    musicStep++;

    // 每小节换一次低音
    if (musicBeat !== 0 && musicStep % 8 === 0) {
      var bar = Math.floor(musicStep / 8) % MELODY_BASS.length;
      AudioMod.tone(MELODY_BASS[bar][0], 0, musicBeat * 3.2, 'sine', 0.34, AudioMod.musicGain);
    }
  }

  /**
   * 启动背景音乐
   */
  AudioMod.startMusic = function () {
    if (AudioMod._musicTimer) return;
    if (!AudioMod.started) AudioMod.init();
    if (!AudioMod.ctx) return;
    AudioMod.resume();
    scheduleBar();
    AudioMod._musicTimer = setInterval(scheduleBar, musicBeat * 1000);
  };

  /**
   * 停止背景音乐
   */
  AudioMod.stopMusic = function () {
    if (AudioMod._musicTimer) {
      clearInterval(AudioMod._musicTimer);
      AudioMod._musicTimer = null;
    }
  };

  /* ---------- 开关 ---------- */
  /**
   * 设置总开关
   * @param {boolean} on true=开声音
   */
  AudioMod.setEnabled = function (on) {
    AudioMod.enabled = !!on;
    if (!on) {
      AudioMod.stopMusic();
      if (AudioMod.master) {
        AudioMod.master.gain.setTargetAtTime(0.0001, AudioMod.ctx.currentTime, 0.05);
      }
    } else {
      if (AudioMod.master) {
        AudioMod.master.gain.setTargetAtTime(0.5, AudioMod.ctx.currentTime, 0.05);
      }
      AudioMod.resume();
      AudioMod.startMusic();
    }
  };

  AudioMod.toggle = function () {
    AudioMod.setEnabled(!AudioMod.enabled);
    return AudioMod.enabled;
  };

  /* ---------- 走路音效节流 ---------- */
  /**
   * 玩家移动时调用，内部做节流，避免每帧都响
   */
  AudioMod.footstep = function () {
    if (!AudioMod.enabled || !AudioMod.ctx) return;
    var now = AudioMod.ctx.currentTime;
    if (now - AudioMod._lastStepTime < 0.34) return;
    AudioMod._lastStepTime = now;
    AudioMod.play('step');
  };

  global.DDAudio = AudioMod;
})(window);
