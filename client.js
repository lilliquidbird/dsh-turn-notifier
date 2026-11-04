/* Completion notifier — Client half.
 *
 * Watches the live session catalog and, when a root session finishes a turn,
 * shows a toast in the bottom-right corner and plays a short chime.
 *
 * Settings live in the Plugins page (bundle configuration) and are persisted in
 * a cookie, so they survive a reload and the random GUI port of a restart.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-turn-notifier',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const CARD_LIFETIME_MS = 6500;
    const MAX_TOASTS = 3;
    const WELCOME_KEY = 'dsh-turn-notifier.welcome.v1';
    const SETTINGS_KEY = 'dsh-turn-notifier.settings.v1';
    /* Cookies are not port-scoped, so settings survive the random GUI port. */
    const SETTINGS_COOKIE = 'dsh_turn_notifier_settings';
    const WELCOME_COOKIE = 'dsh_turn_notifier_welcome';
    const DEFAULT_SETTINGS = {
      cardWidth: 400,
      fontScale: 1,
      volume: 0.6,
      muted: false,
      systemNotification: true,
      sound: 'classic',
    };
    const SOUND_IDS = ['classic', 'crisp', 'marimba', 'arpeggio', 'bell', 'drop'];

    const STRINGS = {
      zh: {
        region: '任务完成提醒',
        done: '已完成',
        elapsedPrefix: '用时 ',
        seconds: (value) => value + ' 秒',
        minutes: (minutes, seconds) => (seconds > 0 ? minutes + ' 分 ' + seconds + ' 秒' : minutes + ' 分'),
        welcomeTitle: '完成提醒已就绪',
        welcomeBody: '任务结束时我会在这里提醒你',
        demoTitle: '这是一条示例提醒',
        questionDemoTitle: '示例：这个方案可以吗？',
        demoSession: '示例会话',
        questionFallback: '需要你确认一件事',
        questionMeta: (sessionTitle, count) =>
          count > 1
            ? '需要你回答 · 共 ' + count + ' 个问题 · 来自「' + sessionTitle + '」'
            : '需要你回答 · 来自「' + sessionTitle + '」',
        questionNotifyTitle: '需要你回答',
        previewQuestion: '预览提问',
        unnamed: '未命名会话',
        close: '关闭提醒',
        settingsTitle: '提醒设置',
        settingsDesc: '控制右下角提醒卡片的大小、字号和提示音，修改立即生效。',
        cardWidth: '卡片宽度',
        cardWidthHint: '提醒卡片在右下角的显示宽度',
        fontSize: '字号大小',
        fontSizeHint: '标题与说明文字的整体缩放',
        volume: '提示音音量',
        volumeHint: '任务完成时提示音的响度',
        mute: '静音',
        muteHint: '关闭全部提示音，只保留卡片',
        previewToast: '预览卡片',
        previewSound: '试听提示音',
        reset: '恢复默认',
        mutedSummary: '已静音',
        summaryWidth: '宽度',
        summaryFont: '字号',
        summaryVolume: '音量',
        diagTitle: '运行状态',
        diagLine: (stats) =>
          '会话 ' +
          stats.sessions +
          ' · 运行中 ' +
          stats.running +
          ' · 已提醒 ' +
          stats.finished +
          ' · 专注静默 ' +
          stats.suppressed +
          ' · 提问 ' +
          stats.questions,
        diagLast: (text) => '上次完成：' + text,
        diagNone: '上次完成：暂无',
        diagCurrentYes: '当前会话：已识别（正看着它时不打扰）',
        diagCurrentNo: '当前会话：未识别（任何完成都会提醒）',
        systemNotify: '系统通知',
        systemNotifyHint: 'DSH 不在前台时，用 Windows 通知提醒你；正在使用 DSH 时只弹卡片',
        testSystemNotify: '测试系统通知',
        systemDemoBody: '任务完成时会这样提醒你',
        sound: '提示音',
        soundHint: '选择时自动试听；音量与静音对它同样生效',
        sounds: {
          classic: '经典双音',
          crisp: '清脆',
          marimba: '木琴',
          arpeggio: '琶音',
          bell: '钟声',
          drop: '水滴',
        },
        diagSystem: (text) => '系统通知：' + text,
        diagSource: (text) => '数据源：' + text,
        diagSystemCount: (shown, failed) => '通知已弹出 ' + shown + ' 次 · 失败 ' + failed + ' 次',
        systemState: {
          default: '待授权（点一次「测试系统通知」）',
          granted: '已授权',
          denied: '被系统拒绝（需在 Windows 设置里允许后重启 DSH）',
          unsupported: '当前环境不支持',
        },
      },
      en: {
        region: 'Task completion alerts',
        done: 'Done',
        elapsedPrefix: 'took ',
        seconds: (value) => value + 's',
        minutes: (minutes, seconds) => (seconds > 0 ? minutes + 'm ' + seconds + 's' : minutes + 'm'),
        welcomeTitle: 'Completion alerts are on',
        welcomeBody: 'You will be notified here when a task finishes',
        demoTitle: 'This is a sample alert',
        questionDemoTitle: 'Sample: does this plan look right?',
        demoSession: 'Sample session',
        questionFallback: 'The agent needs an answer from you',
        questionMeta: (sessionTitle, count) =>
          count > 1
            ? 'Needs your answer · ' + count + ' questions · from "' + sessionTitle + '"'
            : 'Needs your answer · from "' + sessionTitle + '"',
        questionNotifyTitle: 'Your answer is needed',
        previewQuestion: 'Preview question',
        unnamed: 'Untitled session',
        close: 'Dismiss',
        settingsTitle: 'Alert settings',
        settingsDesc: 'Control the size, type scale and chime of the bottom-right alert card. Changes apply immediately.',
        cardWidth: 'Card width',
        cardWidthHint: 'Displayed width of the alert card',
        fontSize: 'Text size',
        fontSizeHint: 'Overall scale of the title and caption',
        volume: 'Chime volume',
        volumeHint: 'How loud the chime is when a task finishes',
        mute: 'Mute',
        muteHint: 'Silence every chime and keep the card only',
        previewToast: 'Preview card',
        previewSound: 'Test chime',
        reset: 'Reset',
        mutedSummary: 'Muted',
        summaryWidth: 'width',
        summaryFont: 'text',
        summaryVolume: 'volume',
        diagTitle: 'Runtime state',
        diagLine: (stats) =>
          stats.sessions +
          ' sessions · ' +
          stats.running +
          ' running · ' +
          stats.finished +
          ' alerted · ' +
          stats.suppressed +
          ' held back · ' +
          stats.questions +
          ' questions',
        diagLast: (text) => 'Last finish: ' + text,
        diagNone: 'Last finish: none yet',
        diagCurrentYes: 'Current session: recognized (held back while you watch it)',
        diagCurrentNo: 'Current session: not recognized (every finish is alerted)',
        systemNotify: 'System notification',
        systemNotifyHint: 'Use a Windows notification when DSH is not in the foreground; the card alone is shown while you use DSH',
        testSystemNotify: 'Test system notification',
        systemDemoBody: 'This is how a finished task will alert you',
        sound: 'Sound',
        soundHint: 'Picking one previews it; volume and mute apply to every sound',
        sounds: {
          classic: 'Classic',
          crisp: 'Crisp',
          marimba: 'Marimba',
          arpeggio: 'Arpeggio',
          bell: 'Bell',
          drop: 'Drop',
        },
        diagSystem: (text) => 'System notification: ' + text,
        diagSource: (text) => 'Data source: ' + text,
        diagSystemCount: (shown, failed) => 'toasts shown ' + shown + ' · failed ' + failed,
        systemState: {
          default: 'not granted yet (press the test button once)',
          granted: 'granted',
          denied: 'blocked by the OS (allow it in Windows settings and restart DSH)',
          unsupported: 'not supported in this environment',
        },
      },
    };

    /* ---------------------------------------------------------------- state */

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function normalizeSettings(raw) {
      const source = raw && typeof raw === 'object' ? raw : {};
      const number = (key, min, max, fallback) => {
        const value = source[key];
        return typeof value === 'number' && Number.isFinite(value) ? clamp(value, min, max) : fallback;
      };
      return {
        cardWidth: Math.round(number('cardWidth', 320, 560, DEFAULT_SETTINGS.cardWidth) / 20) * 20,
        fontScale: Math.round(number('fontScale', 0.85, 1.5, DEFAULT_SETTINGS.fontScale) * 100) / 100,
        volume: Math.round(number('volume', 0, 1, DEFAULT_SETTINGS.volume) * 100) / 100,
        muted: source.muted === true,
        systemNotification: source.systemNotification !== false,
        sound: SOUND_IDS.indexOf(source.sound) >= 0 ? source.sound : DEFAULT_SETTINGS.sound,
      };
    }

    function readCookie(name) {
      try {
        const parts = String(document.cookie || '').split(';');
        for (const part of parts) {
          const index = part.indexOf('=');
          if (index < 0) continue;
          if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
        }
      } catch (error) {
        /* ignore */
      }
      return null;
    }

    function writeCookie(name, value) {
      try {
        document.cookie = name + '=' + encodeURIComponent(value) + '; path=/; max-age=31536000; SameSite=Lax';
      } catch (error) {
        /* ignore */
      }
    }

    function readSettings() {
      const stored = readCookie(SETTINGS_COOKIE);
      if (stored !== null && stored !== '') {
        try {
          return normalizeSettings(JSON.parse(stored));
        } catch (error) {
          /* fall through to the per-port store */
        }
      }
      try {
        const legacy = window.localStorage.getItem(SETTINGS_KEY);
        if (legacy !== null && legacy !== '') return normalizeSettings(JSON.parse(legacy));
      } catch (error) {
        /* ignore */
      }
      return { ...DEFAULT_SETTINGS };
    }

    const settingsStore = {
      value: readSettings(),
      listeners: new Set(),
      get() {
        return this.value;
      },
      set(patch) {
        this.value = normalizeSettings({ ...this.value, ...patch });
        const serialized = JSON.stringify(this.value);
        writeCookie(SETTINGS_COOKIE, serialized);
        try {
          window.localStorage.setItem(SETTINGS_KEY, serialized);
        } catch (error) {
          /* private mode: keep the in-memory value */
        }
        for (const listener of Array.from(this.listeners)) {
          try {
            listener();
          } catch (error) {
            /* a broken subscriber must not block the others */
          }
        }
      },
      reset() {
        this.set({ ...DEFAULT_SETTINGS });
      },
      subscribe(listener) {
        this.listeners.add(listener);
        return () => {
          this.listeners.delete(listener);
        };
      },
    };

    function useSettings() {
      const [value, setValue] = React.useState(() => settingsStore.get());
      React.useEffect(() => settingsStore.subscribe(() => setValue(settingsStore.get())), []);
      return value;
    }

    /** Counters the settings page shows so the detection path is observable. */
    const EMPTY_DIAGNOSTICS = {
      sessions: 0,
      running: 0,
      finished: 0,
      suppressed: 0,
      hasCurrent: false,
      lastAt: 0,
      lastTitle: '',
      permission: 'default',
      source: '',
      shown: 0,
      failed: 0,
      questions: 0,
      hasProjections: false,
    };

    const diagnosticsStore = {
      value: { ...EMPTY_DIAGNOSTICS },
      listeners: new Set(),
      get() {
        return this.value;
      },
      patch(next) {
        const previous = this.value;
        let changed = false;
        for (const key of Object.keys(next)) {
          if (previous[key] !== next[key]) {
            changed = true;
            break;
          }
        }
        if (!changed) return;
        this.value = { ...previous, ...next };
        for (const listener of Array.from(this.listeners)) {
          try {
            listener();
          } catch (error) {
            /* ignore */
          }
        }
      },
      subscribe(listener) {
        this.listeners.add(listener);
        return () => {
          this.listeners.delete(listener);
        };
      },
    };

    function useDiagnostics() {
      const [value, setValue] = React.useState(() => diagnosticsStore.get());
      React.useEffect(() => diagnosticsStore.subscribe(() => setValue(diagnosticsStore.get())), []);
      return value;
    }

    /** Lets the settings page push a sample card into the live toast stack. */
    const previewBus = {
      listeners: new Set(),
      fire(kind) {
        for (const listener of Array.from(this.listeners)) {
          try {
            listener(kind);
          } catch (error) {
            /* ignore */
          }
        }
      },
      subscribe(listener) {
        this.listeners.add(listener);
        return () => {
          this.listeners.delete(listener);
        };
      },
    };

    let activeChime = null;

    function playSettingsChime(scale) {
      if (activeChime === null) return false;
      const settings = settingsStore.get();
      if (settings.muted) return false;
      const volume = settings.volume * (typeof scale === 'number' ? scale : 1);
      if (volume <= 0) return false;
      return activeChime.play(volume, settings.sound);
    }

    /** Question alerts use their own fixed motif, independent of the chime picker. */
    function playQuestionChime() {
      if (activeChime === null) return false;
      const settings = settingsStore.get();
      if (settings.muted) return false;
      if (settings.volume <= 0) return false;
      return activeChime.play(settings.volume, 'question');
    }

    /* -------------------------------------------------------------- helpers */

    function formatDuration(ms, strings) {
      if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '';
      const total = Math.round(ms / 1000);
      if (total < 60) return strings.seconds(Math.max(1, total));
      return strings.minutes(Math.floor(total / 60), total % 60);
    }

    function formatClock(timestamp) {
      if (typeof timestamp !== 'number' || timestamp <= 0) return '';
      try {
        const date = new Date(timestamp);
        const pad = (value) => (value < 10 ? '0' + value : String(value));
        return pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
      } catch (error) {
        return '';
      }
    }

    function titleOf(summary, fallback) {
      if (!summary || typeof summary !== 'object') return fallback;
      const candidates = [summary.displayTitle, summary.title, summary.name];
      for (const value of candidates) {
        if (typeof value === 'string' && value.trim() !== '') return value.trim();
      }
      return fallback;
    }

    function detectLanguage(localeService) {
      try {
        const snapshot =
          localeService && typeof localeService.getLocale === 'function' ? localeService.getLocale() : null;
        const id = snapshot && (snapshot.id || snapshot.locale || snapshot.current);
        if (typeof id === 'string' && id !== '') {
          return id.toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
        }
      } catch (error) {
        /* fall through to the browser locale */
      }
      const navigatorLanguage =
        typeof navigator !== 'undefined' && typeof navigator.language === 'string' ? navigator.language : '';
      return navigatorLanguage.toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
    }

    /** Voice recipes per selectable sound: frequency, start offset, decay and timbre. */
    const SOUND_SCHEDULES = {
      classic: [
        { freq: 1318.51, at: 0, dur: 0.34, type: 'sine', gain: 1 },
        { freq: 1760.0, at: 0.115, dur: 0.3, type: 'sine', gain: 1 },
      ],
      crisp: [
        { freq: 1800, to: 1150, glide: 0.07, at: 0, dur: 0.18, type: 'sine', gain: 1 },
        { freq: 2400, at: 0, dur: 0.05, type: 'triangle', gain: 0.35 },
      ],
      marimba: [
        { freq: 1046.5, at: 0, dur: 0.42, type: 'triangle', gain: 0.9 },
        { freq: 2093.0, at: 0, dur: 0.16, type: 'sine', gain: 0.25 },
        { freq: 783.99, at: 0.1, dur: 0.46, type: 'triangle', gain: 0.8 },
        { freq: 659.25, at: 0.2, dur: 0.5, type: 'triangle', gain: 0.7 },
      ],
      arpeggio: [
        { freq: 523.25, at: 0, dur: 0.3, type: 'sine', gain: 0.8 },
        { freq: 659.25, at: 0.07, dur: 0.3, type: 'sine', gain: 0.8 },
        { freq: 783.99, at: 0.14, dur: 0.32, type: 'sine', gain: 0.8 },
        { freq: 1046.5, at: 0.21, dur: 0.4, type: 'sine', gain: 0.9 },
      ],
      bell: [
        { freq: 523.25, at: 0, dur: 1.1, type: 'sine', gain: 1 },
        { freq: 1444.4, at: 0, dur: 0.7, type: 'sine', gain: 0.35 },
        { freq: 2825.0, at: 0, dur: 0.4, type: 'sine', gain: 0.15 },
      ],
      drop: [
        { freq: 1200, to: 720, glide: 0.11, at: 0, dur: 0.2, type: 'sine', gain: 1 },
        { freq: 2600, at: 0, dur: 0.04, type: 'sine', gain: 0.2 },
      ],
      /* Fixed "the agent is asking you something" motif: rising, with the second
         note held long enough to read as a question rather than a finish. */
      question: [
        { freq: 659.25, at: 0, dur: 0.22, type: 'sine', gain: 0.85 },
        { freq: 987.77, at: 0.14, dur: 0.55, type: 'sine', gain: 1 },
        { freq: 1975.5, at: 0.14, dur: 0.28, type: 'sine', gain: 0.12 },
      ],
    };

    function renderVoice(audio, spec, start, level) {
      const at = start + spec.at;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = spec.type || 'sine';
      oscillator.frequency.setValueAtTime(spec.freq, at);
      if (typeof spec.to === 'number' && spec.to > 0) {
        oscillator.frequency.exponentialRampToValueAtTime(spec.to, at + (spec.glide || 0.08));
      }
      const peak = Math.max(0.0002, 0.16 * level * (typeof spec.gain === 'number' ? spec.gain : 1));
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(peak, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + spec.dur);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(at);
      oscillator.stop(at + spec.dur + 0.03);
    }

    /** Two-note chime, synthesised so the bundle ships no audio asset. */
    function createChime() {
      let context = null;
      let unavailable = false;

      const ensure = () => {
        if (unavailable) return null;
        try {
          const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
          if (typeof AudioContextCtor !== 'function') {
            unavailable = true;
            return null;
          }
          if (context === null) context = new AudioContextCtor();
          if (context.state === 'suspended' && typeof context.resume === 'function') {
            const resumed = context.resume();
            if (resumed && typeof resumed.catch === 'function') resumed.catch(() => {});
          }
          return context;
        } catch (error) {
          unavailable = true;
          return null;
        }
      };

      return {
        unlock: () => {
          ensure();
        },
        play: (volume, style) => {
          const audio = ensure();
          if (audio === null || audio.state !== 'running') return false;
          try {
            const level = typeof volume === 'number' && volume > 0 ? Math.min(1, volume) : 0.6;
            const schedule = SOUND_SCHEDULES[style] || SOUND_SCHEDULES.classic;
            const start = audio.currentTime + 0.03;
            for (const spec of schedule) renderVoice(audio, spec, start, level);
            return true;
          } catch (error) {
            return false;
          }
        },
      };
    }

    /* --------------------------------------------------------- notifications */

    function currentNotificationPermission() {
      try {
        if (typeof window === 'undefined' || typeof window.Notification !== 'function') return 'unsupported';
        const value = window.Notification.permission;
        if (value === 'granted' || value === 'denied') return value;
        return 'default';
      } catch (error) {
        return 'unsupported';
      }
    }

    function requestNotificationPermission() {
      const state = currentNotificationPermission();
      diagnosticsStore.patch({ permission: state });
      if (state !== 'default') return;
      try {
        const result = window.Notification.requestPermission();
        if (result && typeof result.then === 'function') {
          result
            .then((value) => {
              diagnosticsStore.patch({ permission: value === 'granted' ? 'granted' : 'denied' });
            })
            .catch(() => {});
        }
      } catch (error) {
        /* keep 'default'; the next attempt may still succeed */
      }
    }

    /**
     * Windows toast through the renderer's Notification API, which Electron
     * maps onto a native notification. Returns false when it cannot show one.
     */
    function showSystemNotification(payload) {
      try {
        if (settingsStore.get().systemNotification !== true) return false;
        if (currentNotificationPermission() !== 'granted') return false;
        const notification = new window.Notification(payload.title, {
          body: payload.body,
          silent: true,
          tag: payload.tag,
        });
        notification.onshow = () => {
          const stats = diagnosticsStore.get();
          diagnosticsStore.patch({ shown: stats.shown + 1 });
        };
        notification.onerror = () => {
          const stats = diagnosticsStore.get();
          diagnosticsStore.patch({ failed: stats.failed + 1 });
        };
        notification.onclick = () => {
          try {
            notification.close();
          } catch (error) {
            /* ignore */
          }
          try {
            window.focus();
          } catch (error) {
            /* ignore */
          }
          if (typeof payload.onClick === 'function') {
            try {
              payload.onClick();
            } catch (error) {
              /* ignore */
            }
          }
        };
        return true;
      } catch (error) {
        return false;
      }
    }

    /* ---------------------------------------------------------------- styles */

    const TOAST_CSS = [
      '.tn-stack{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:flex;flex-direction:column;gap:10px;align-items:flex-end;pointer-events:none;font-family:inherit}',
      '.tn-card{pointer-events:auto;width:var(--tn-width,400px);max-width:calc(100vw - 40px);box-sizing:border-box;display:grid;grid-template-columns:calc(22px*var(--tn-font,1)) minmax(0,1fr) calc(22px*var(--tn-font,1));gap:calc(10px*var(--tn-font,1));align-items:start;padding:calc(12px*var(--tn-font,1)) calc(12px*var(--tn-font,1)) calc(12px*var(--tn-font,1)) calc(14px*var(--tn-font,1));border-radius:14px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:0 14px 34px rgba(0,0,0,.16),0 2px 6px rgba(0,0,0,.06);cursor:pointer;user-select:none;animation:tn-in .2s cubic-bezier(.2,.8,.2,1);transition:border-color .15s ease}',
      '.tn-card:hover{border-color:var(--dsw-alias-border-l2)}',
      '.tn-card:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
      '.tn-card.tn-leaving{animation:tn-out .16s ease-in forwards}',
      '.tn-icon{display:flex;align-items:center;justify-content:center;height:calc(22px*var(--tn-font,1))}',
      '.tn-body{min-width:0;display:flex;flex-direction:column;gap:calc(3px*var(--tn-font,1))}',
      '.tn-title{font-size:calc(13px*var(--tn-font,1));font-weight:600;line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.tn-meta{font-size:calc(12px*var(--tn-font,1));line-height:1.3;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.tn-close{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary);width:calc(22px*var(--tn-font,1));height:calc(22px*var(--tn-font,1));border-radius:6px;font-size:calc(15px*var(--tn-font,1));line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;margin:-2px -2px 0 0}',
      '.tn-close:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '@keyframes tn-in{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}',
      '@keyframes tn-out{to{opacity:0;transform:translateY(6px) scale(.985)}}',
      '@media (prefers-reduced-motion:reduce){.tn-card,.tn-card.tn-leaving{animation:none}}',
    ].join('');

    const SETTINGS_CSS = [
      '.tn-set{margin:14px 0 18px;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);padding:4px 16px 12px;font-family:inherit}',
      '.tn-set-head{padding:12px 0 10px}',
      '.tn-set-title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.tn-set-desc{margin-top:4px;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary)}',
      '.tn-set-row{display:flex;align-items:center;gap:16px;padding:12px 0;border-top:1px solid var(--dsw-alias-border-l1)}',
      '.tn-set-rowtext{flex:1;min-width:0}',
      '.tn-set-label{font-size:13px;color:var(--dsw-alias-label-primary)}',
      '.tn-set-hint{margin-top:2px;font-size:12px;line-height:1.45;color:var(--dsw-alias-label-secondary)}',
      '.tn-set-control{display:flex;align-items:center;gap:10px;flex:0 0 auto}',
      '.tn-set-value{min-width:52px;text-align:right;font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      'input.tn-range{width:min(200px,38vw);accent-color:var(--dsw-alias-brand-primary);cursor:pointer}',
      '.tn-switch{position:relative;width:40px;height:22px;box-sizing:border-box;border-radius:11px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);cursor:pointer;padding:0;transition:background .15s ease,border-color .15s ease}',
      '.tn-switch.is-on{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}',
      '.tn-switch-knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.24);transition:transform .15s ease}',
      '.tn-switch.is-on .tn-switch-knob{transform:translateX(18px)}',
      '.tn-set-actions{display:flex;flex-wrap:wrap;gap:8px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l1)}',
      '.tn-select{appearance:none;-webkit-appearance:none;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;font-size:12px;line-height:1.2;padding:6px 26px 6px 10px;min-width:132px;cursor:pointer;font-family:inherit;background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - 14px) 50%,calc(100% - 9px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat}',
      '.tn-select:hover{border-color:var(--dsw-alias-border-l2)}',
      '.tn-select:disabled{opacity:.5;cursor:default}',
      '.tn-btn{appearance:none;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:12px;line-height:1.2;padding:7px 12px;border-radius:8px;cursor:pointer;font-family:inherit}',
      '.tn-btn:hover{border-color:var(--dsw-alias-border-l2)}',
      '.tn-btn:disabled{opacity:.45;cursor:default}',
      '.tn-btn-ghost{background:transparent;color:var(--dsw-alias-label-secondary)}',
      '.tn-summary{font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.tn-set-diag{margin-top:12px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l1);font-size:12px;line-height:1.7;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.tn-set-diag-title{font-weight:600;color:var(--dsw-alias-label-primary);margin-bottom:2px}',
    ].join('');

    /* ------------------------------------------------------------- settings UI */

    function SettingRow(props) {
      return h(
        'div',
        { className: 'tn-set-row' },
        h(
          'div',
          { className: 'tn-set-rowtext' },
          h('div', { className: 'tn-set-label' }, props.label),
          props.hint ? h('div', { className: 'tn-set-hint' }, props.hint) : null
        ),
        h(
          'div',
          { className: 'tn-set-control' },
          props.children,
          props.value ? h('span', { className: 'tn-set-value' }, props.value) : null
        )
      );
    }

    function Switch(props) {
      return h(
        'button',
        {
          type: 'button',
          role: 'switch',
          'aria-checked': props.checked,
          'aria-label': props.label,
          className: 'tn-switch' + (props.checked ? ' is-on' : ''),
          onClick: () => props.onChange(!props.checked),
        },
        h('span', { className: 'tn-switch-knob' })
      );
    }

    function SettingsPanel(props) {
      const strings = props.strings;
      const settings = useSettings();
      const diag = useDiagnostics();
      const permission = diag.permission || currentNotificationPermission();
      const percent = Math.round(settings.fontScale * 100) + '%';
      const volumePercent = Math.round(settings.volume * 100) + '%';

      if (props.view === 'summary') {
        const parts = settings.muted
          ? [strings.mutedSummary]
          : [
              strings.summaryWidth + ' ' + settings.cardWidth + 'px',
              strings.summaryFont + ' ' + percent,
              strings.summaryVolume + ' ' + volumePercent,
            ];
        return h('span', { className: 'tn-summary' }, parts.join(' · '));
      }

      return h(
        'div',
        { className: 'tn-set' },
        h('style', { dangerouslySetInnerHTML: { __html: SETTINGS_CSS } }),
        h(
          'div',
          { className: 'tn-set-head' },
          h('div', { className: 'tn-set-title' }, strings.settingsTitle),
          h('div', { className: 'tn-set-desc' }, strings.settingsDesc)
        ),
        h(
          SettingRow,
          { label: strings.cardWidth, hint: strings.cardWidthHint, value: settings.cardWidth + ' px' },
          h('input', {
            className: 'tn-range',
            type: 'range',
            min: 320,
            max: 560,
            step: 20,
            value: settings.cardWidth,
            'aria-label': strings.cardWidth,
            onChange: (event) => settingsStore.set({ cardWidth: Number(event.target.value) }),
          })
        ),
        h(
          SettingRow,
          { label: strings.fontSize, hint: strings.fontSizeHint, value: percent },
          h('input', {
            className: 'tn-range',
            type: 'range',
            min: 85,
            max: 150,
            step: 5,
            value: Math.round(settings.fontScale * 100),
            'aria-label': strings.fontSize,
            onChange: (event) => settingsStore.set({ fontScale: Number(event.target.value) / 100 }),
          })
        ),
        h(
          SettingRow,
          { label: strings.mute, hint: strings.muteHint },
          h(Switch, {
            checked: settings.muted,
            label: strings.mute,
            onChange: (next) => settingsStore.set({ muted: next }),
          })
        ),
        h(
          SettingRow,
          { label: strings.sound, hint: strings.soundHint },
          h(
            'select',
            {
              className: 'tn-select',
              value: settings.sound,
              disabled: settings.muted,
              'aria-label': strings.sound,
              onChange: (event) => {
                settingsStore.set({ sound: event.target.value });
                playSettingsChime(1);
              },
            },
            SOUND_IDS.map((id) => h('option', { key: id, value: id }, strings.sounds[id] || id))
          )
        ),
        h(
          SettingRow,
          { label: strings.volume, hint: strings.volumeHint, value: volumePercent },
          h('input', {
            className: 'tn-range',
            type: 'range',
            min: 0,
            max: 100,
            step: 5,
            value: Math.round(settings.volume * 100),
            disabled: settings.muted,
            'aria-label': strings.volume,
            onChange: (event) => settingsStore.set({ volume: Number(event.target.value) / 100 }),
          })
        ),
        h(
          SettingRow,
          { label: strings.systemNotify, hint: strings.systemNotifyHint },
          h(Switch, {
            checked: settings.systemNotification,
            label: strings.systemNotify,
            onChange: (next) => settingsStore.set({ systemNotification: next }),
          })
        ),
        h(
          'div',
          { className: 'tn-set-actions' },
          h(
            'button',
            {
              type: 'button',
              className: 'tn-btn',
              onClick: () => previewBus.fire('done'),
            },
            strings.previewToast
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'tn-btn',
              onClick: () => previewBus.fire('question'),
            },
            strings.previewQuestion
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'tn-btn',
              disabled: settings.muted || settings.volume <= 0,
              onClick: () => playSettingsChime(1),
            },
            strings.previewSound
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'tn-btn',
              disabled:
                !settings.systemNotification ||
                permission === 'unsupported' ||
                permission === 'denied',
              onClick: () => {
                const fire = () =>
                  showSystemNotification({
                    title: strings.demoTitle,
                    body: strings.systemDemoBody,
                    tag: 'turn-notifier:preview',
                  });
                if (currentNotificationPermission() === 'default') {
                  requestNotificationPermission();
                  window.setTimeout(fire, 400);
                } else {
                  fire();
                }
              },
            },
            strings.testSystemNotify
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'tn-btn tn-btn-ghost',
              onClick: () => settingsStore.reset(),
            },
            strings.reset
          )
        ),
        h(
          'div',
          { className: 'tn-set-diag' },
          h('div', { className: 'tn-set-diag-title' }, strings.diagTitle),
          h('div', null, strings.diagLine(diag)),
          h(
            'div',
            null,
            diag.lastAt > 0 ? strings.diagLast(formatClock(diag.lastAt) + ' · ' + diag.lastTitle) : strings.diagNone
          ),
          h('div', null, diag.hasCurrent ? strings.diagCurrentYes : strings.diagCurrentNo),
          h('div', null, strings.diagSystem(strings.systemState[permission] || permission)),
          h('div', null, strings.diagSystemCount(diag.shown, diag.failed)),
          h('div', null, strings.diagSource((diag.source || '—') + (diag.hasProjections ? ' · 投影 ✓' : ' · 投影 ✗')))
        )
      );
    }

    /* ---------------------------------------------------------------- toasts */

    function ToastCard(props) {
      const toast = props.toast;
      const strings = props.strings;
      const onDismiss = props.onDismiss;
      const onOpen = props.onOpen;
      const [leaving, setLeaving] = React.useState(false);
      const [paused, setPaused] = React.useState(false);
      const leavingRef = React.useRef(false);
      const dismissRef = React.useRef(onDismiss);
      dismissRef.current = onDismiss;

      const requestClose = React.useCallback(() => {
        if (leavingRef.current) return;
        leavingRef.current = true;
        setLeaving(true);
        window.setTimeout(() => {
          dismissRef.current(toast.key);
        }, 170);
      }, [toast.key]);

      React.useEffect(() => {
        if (paused) return undefined;
        const elapsed = Date.now() - toast.createdAt;
        const remaining = Math.max(1400, CARD_LIFETIME_MS - elapsed);
        const timer = window.setTimeout(requestClose, remaining);
        return () => window.clearTimeout(timer);
      }, [paused, requestClose, toast.createdAt]);

      const activate = () => {
        onOpen(toast);
        requestClose();
      };

      let meta;
      if (toast.kind === 'welcome') meta = toast.subtitle;
      else if (toast.kind === 'demo') meta = strings.done + ' · ' + strings.elapsedPrefix + formatDuration(83000, strings);
      else if (toast.kind === 'question')
        meta = strings.questionMeta(toast.sessionTitle || strings.unnamed, toast.count || 1);
      else meta = strings.done + (toast.ms > 0 ? ' · ' + strings.elapsedPrefix + formatDuration(toast.ms, strings) : '');

      return h(
        'div',
        {
          className: 'tn-card' + (leaving ? ' tn-leaving' : ''),
          role: 'status',
          tabIndex: 0,
          title: toast.kind === 'done' || toast.kind === 'question' ? toast.title : undefined,
          onClick: activate,
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              activate();
            } else if (event.key === 'Escape') {
              requestClose();
            }
          },
          onMouseEnter: () => setPaused(true),
          onMouseLeave: () => setPaused(false),
          onFocus: () => setPaused(true),
          onBlur: () => setPaused(false),
        },
        h(
          'span',
          { className: 'tn-icon', 'aria-hidden': true },
          toast.kind === 'question'
            ? h(
                'svg',
                { viewBox: '0 0 24 24', width: '100%', height: '100%', fill: 'none' },
                h('circle', {
                  cx: 12,
                  cy: 12,
                  r: 10,
                  fill: 'var(--dsw-alias-state-warn-primary)',
                  opacity: 0.18,
                }),
                h(
                  'text',
                  {
                    x: 12,
                    y: 16.6,
                    textAnchor: 'middle',
                    fontSize: 13,
                    fontWeight: 700,
                    fill: 'var(--dsw-alias-state-warn-primary)',
                  },
                  '?'
                )
              )
            : h(
                'svg',
                { viewBox: '0 0 24 24', width: '100%', height: '100%', fill: 'none' },
                h('circle', {
                  cx: 12,
                  cy: 12,
                  r: 10,
                  fill: 'var(--dsw-alias-state-success-primary)',
                  opacity: 0.16,
                }),
                h('path', {
                  d: 'M7.4 12.3l3.1 3.1 6.1-6.6',
                  stroke: 'var(--dsw-alias-state-success-primary)',
                  strokeWidth: 2,
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                })
              )
        ),
        h(
          'div',
          { className: 'tn-body' },
          h('div', { className: 'tn-title' }, toast.title || strings.unnamed),
          h('div', { className: 'tn-meta' }, meta)
        ),
        h(
          'button',
          {
            className: 'tn-close',
            type: 'button',
            'aria-label': strings.close,
            onClick: (event) => {
              event.stopPropagation();
              requestClose();
            },
          },
          '×'
        )
      );
    }

    function ToastStack(props) {
      const tn = props.tn;
      const catalog = props.catalog;
      const strings = tn.strings;
      const chime = tn.chime;
      const settings = useSettings();
      const [toasts, setToasts] = React.useState([]);
      const previous = React.useRef(null);
      const previousQuestions = React.useRef(null);

      const evaluateCatalog = React.useCallback((catalog) => {
        if (!catalog || typeof catalog !== 'object') return;
        const byId = catalog.byId;
        if (!byId || typeof byId !== 'object') return;
        const ids = Array.isArray(catalog.ids) ? catalog.ids : Object.keys(byId);
        const timestamp = Date.now();
        const focused =
          typeof document !== 'undefined' && typeof document.hasFocus === 'function' ? document.hasFocus() : true;
        const current = typeof catalog.current === 'string' ? catalog.current : undefined;
        const next = Object.create(null);
        const finished = [];
        let suppressed = 0;

        for (const id of ids) {
          const summary = byId[id];
          if (!summary || typeof summary !== 'object') continue;
          const running = summary.running === true;
          const before = previous.current ? previous.current[id] : undefined;
          next[id] = {
            running,
            since: running ? (before && before.running ? before.since : timestamp) : 0,
          };
          if (!before || !before.running || running) continue;
          if (summary.blank === true) continue;
          if (summary.origin === 'subagent') continue;
          if (summary.parentId !== undefined && summary.parentId !== null) continue;
          if (id === current && focused) {
            suppressed += 1;
            continue;
          }
          finished.push({
            id,
            title: titleOf(summary, strings.unnamed),
            ms: before.since ? timestamp - before.since : 0,
          });
        }

        /*
         * Pending-question detection. DSH publishes a client-visible `userQuestions`
         * projection per session: `active` lists the calls still waiting for an
         * answer (`open`) or already continued past their timeout (`continued`).
         */
        const projections = catalog.projectionsBySession;
        const asked = [];
        const nextQuestions = Object.create(null);

        for (const id of ids) {
          const summary = byId[id];
          if (!summary || typeof summary !== 'object') continue;
          if (summary.blank === true || summary.origin === 'subagent') continue;
          if (summary.parentId !== undefined && summary.parentId !== null) continue;
          const values = (projections && projections[id] && projections[id].values) || summary.projectionValues;
          const pending = values && values.userQuestions;
          const active = pending && Array.isArray(pending.active) ? pending.active : [];
          const openIds = [];
          for (const item of active) {
            if (item && item.state === 'open' && typeof item.callId === 'string') openIds.push(item.callId);
          }
          nextQuestions[id] = openIds;
          if (!previousQuestions.current) continue;
          const before = previousQuestions.current[id];
          for (const item of active) {
            if (!item || item.state !== 'open' || typeof item.callId !== 'string') continue;
            if (Array.isArray(before) && before.indexOf(item.callId) >= 0) continue;
            const first = Array.isArray(item.questions) && item.questions.length > 0 ? item.questions[0] : undefined;
            asked.push({
              id,
              callId: item.callId,
              title:
                first && typeof first.question === 'string' && first.question.trim() !== ''
                  ? first.question.trim()
                  : strings.questionFallback,
              count: Array.isArray(item.questions) ? item.questions.length : 1,
              sessionTitle: titleOf(summary, strings.unnamed),
              here: id === current && focused,
            });
          }
        }
        previousQuestions.current = nextQuestions;

        previous.current = next;

        const sessionCount = Object.keys(next).length;
        const runningCount = Object.keys(next).reduce((count, key) => (next[key].running ? count + 1 : count), 0);
        const stats = diagnosticsStore.get();
        diagnosticsStore.patch(
          Object.assign(
            {
              sessions: sessionCount,
              running: runningCount,
              finished: stats.finished + finished.length,
              suppressed: stats.suppressed + suppressed,
              hasCurrent: current !== undefined,
              hasProjections: projections !== undefined,
            },
            finished.length > 0 ? { lastAt: timestamp, lastTitle: finished[0].title } : {}
          )
        );

        if (asked.length > 0) {
          const askedStats = diagnosticsStore.get();
          diagnosticsStore.patch({ questions: askedStats.questions + asked.length });
          playQuestionChime();
          const visible = asked.filter((item) => !item.here);
          if (visible.length > 0) {
            if (!focused) {
              for (const item of visible) {
                showSystemNotification({
                  title: strings.questionNotifyTitle,
                  body: item.title,
                  tag: 'turn-notifier-q:' + item.id + ':' + item.callId,
                  onClick: () => tn.openSession(item.id),
                });
              }
            }
            setToasts((list) => {
              const merged = list.slice();
              for (const item of visible) {
                const toast = {
                  key: 'q:' + item.id + ':' + item.callId,
                  kind: 'question',
                  sessionId: item.id,
                  title: item.title,
                  sessionTitle: item.sessionTitle,
                  count: item.count,
                  createdAt: Date.now(),
                };
                const index = merged.findIndex((entry) => entry.key === toast.key);
                if (index >= 0) merged[index] = toast;
                else merged.push(toast);
              }
              return merged.slice(-MAX_TOASTS);
            });
          }
        }

        if (finished.length === 0) return;

        playSettingsChime(1);
        if (!focused) {
          for (const item of finished) {
            showSystemNotification({
              title: item.title,
              body:
                strings.done +
                (item.ms > 0 ? ' · ' + strings.elapsedPrefix + formatDuration(item.ms, strings) : ''),
              tag: 'turn-notifier:' + item.id,
              onClick: () => tn.openSession(item.id),
            });
          }
        }
        setToasts((list) => {
          const merged = list.slice();
          for (const item of finished) {
            const toast = {
              key: 's:' + item.id,
              kind: 'done',
              sessionId: item.id,
              title: item.title,
              ms: item.ms,
              createdAt: Date.now(),
            };
            const index = merged.findIndex((entry) => entry.kind === 'done' && entry.sessionId === item.id);
            if (index >= 0) merged[index] = toast;
            else merged.push(toast);
          }
          return merged.slice(-MAX_TOASTS);
        });
      }, [chime, strings, tn]);

      /*
       * Data-driven detection. A hidden window throttles React's rendering, so a
       * render-driven effect can miss the moment a session goes idle. Subscribing
       * to the sessions store keeps detection on the message handler instead.
       */
      React.useEffect(() => {
        const service = tn.sessions;
        const source = service && service.list;
        if (!source || typeof source.getSnapshot !== 'function' || typeof source.subscribe !== 'function') {
          return undefined;
        }
        diagnosticsStore.patch({ source: 'service' });
        const run = () => {
          try {
            evaluateCatalog(source.getSnapshot());
          } catch (error) {
            /* ignore a torn read */
          }
        };
        run();
        return source.subscribe(run);
      }, [evaluateCatalog, tn]);

      /* Fallback for a slot that only provides the React hook. */
      React.useEffect(() => {
        const service = tn.sessions;
        const source = service && service.list;
        if (source && typeof source.subscribe === 'function') return;
        diagnosticsStore.patch({ source: 'hook' });
        evaluateCatalog(catalog);
      }, [catalog, evaluateCatalog, tn]);

      React.useEffect(() => {
        let cancelled = false;
        const timer = window.setTimeout(() => {
          if (cancelled) return;
          let seen = readCookie(WELCOME_COOKIE) === '1';
          if (!seen) {
            try {
              seen = window.localStorage.getItem(WELCOME_KEY) === '1';
            } catch (error) {
              seen = false;
            }
          }
          if (seen) return;
          writeCookie(WELCOME_COOKIE, '1');
          try {
            window.localStorage.setItem(WELCOME_KEY, '1');
          } catch (error) {
            /* private mode: show it anyway */
          }
          setToasts((list) =>
            list
              .concat({
                key: 'welcome:' + Date.now(),
                kind: 'welcome',
                createdAt: Date.now(),
                title: strings.welcomeTitle,
                subtitle: strings.welcomeBody,
              })
              .slice(-MAX_TOASTS)
          );
          playSettingsChime(0.8);
        }, 900);
        return () => {
          cancelled = true;
          window.clearTimeout(timer);
        };
      }, [chime, strings]);

      React.useEffect(
        () =>
          previewBus.subscribe((kind) => {
            if (kind === 'question') {
              playQuestionChime();
              setToasts((list) =>
                list
                  .concat({
                    key: 'demoq:' + Date.now(),
                    kind: 'question',
                    createdAt: Date.now(),
                    title: strings.questionDemoTitle,
                    sessionTitle: strings.demoSession,
                    count: 1,
                  })
                  .slice(-MAX_TOASTS)
              );
              return;
            }
            setToasts((list) =>
              list
                .concat({
                  key: 'demo:' + Date.now(),
                  kind: 'demo',
                  createdAt: Date.now(),
                  title: strings.demoTitle,
                  ms: 83000,
                })
                .slice(-MAX_TOASTS)
            );
          }),
        [strings]
      );

      const dismiss = React.useCallback((key) => {
        setToasts((list) => list.filter((entry) => entry.key !== key));
      }, []);

      const open = React.useCallback(
        (toast) => {
          if (!toast || !toast.sessionId) return;
          if (toast.kind !== 'done' && toast.kind !== 'question') return;
          tn.openSession(toast.sessionId);
        },
        [tn]
      );

      const stackStyle = {
        '--tn-width': settings.cardWidth + 'px',
        '--tn-font': String(settings.fontScale),
      };

      return h(
        'div',
        {
          className: 'tn-stack',
          style: stackStyle,
          role: 'region',
          'aria-label': strings.region,
          'aria-live': 'polite',
        },
        h('style', { dangerouslySetInnerHTML: { __html: TOAST_CSS } }),
        toasts.map((toast) =>
          h(ToastCard, { key: toast.key, toast, strings, onDismiss: dismiss, onOpen: open })
        )
      );
    }

    /* ---------------------------------------------------------------- layers */

    /** Preferred path: the slot's standard `useSessions` selector hook. */
    function HookedLayer(props) {
      const catalog = props.useSessions((state) => state);
      return h(ToastStack, Object.assign({}, props, { catalog }));
    }

    /** Fallback path: subscribe to the Client sessions service directly. */
    function ServiceLayer(props) {
      const [catalog, setCatalog] = React.useState(null);
      const tn = props.tn;

      React.useEffect(() => {
        const service = tn.sessions || (tn.ctx && typeof tn.ctx.get === 'function' ? tn.ctx.get('sessions') : undefined);
        const source = service && service.list;
        if (!source || typeof source.getSnapshot !== 'function' || typeof source.subscribe !== 'function') {
          return undefined;
        }
        const sync = () => {
          try {
            setCatalog(source.getSnapshot());
          } catch (error) {
            /* ignore a torn read */
          }
        };
        sync();
        return source.subscribe(sync);
      }, [tn]);

      return h(ToastStack, Object.assign({}, props, { catalog }));
    }

    function Entry(props) {
      return typeof props.useSessions === 'function' ? h(HookedLayer, props) : h(ServiceLayer, props);
    }

    function apply(ctx) {
      const chime = createChime();
      activeChime = chime;
      diagnosticsStore.patch({ permission: currentNotificationPermission() });

      ctx.effect(() => {
        const unlock = () => {
          chime.unlock();
          requestNotificationPermission();
        };
        window.addEventListener('pointerdown', unlock, true);
        window.addEventListener('keydown', unlock, true);
        window.addEventListener('touchstart', unlock, true);
        return () => {
          window.removeEventListener('pointerdown', unlock, true);
          window.removeEventListener('keydown', unlock, true);
          window.removeEventListener('touchstart', unlock, true);
        };
      });

      let localeService;
      let sessionsService;
      try {
        localeService = ctx.get('locale');
      } catch (error) {
        localeService = undefined;
      }
      try {
        sessionsService = ctx.get('sessions');
      } catch (error) {
        sessionsService = undefined;
      }

      const language = detectLanguage(localeService);
      const strings = STRINGS[language] || STRINGS.en;

      const tn = {
        strings,
        chime,
        ctx,
        sessions: sessionsService,
        openSession(sessionId) {
          try {
            const workspace = ctx.get('uiWorkspace');
            if (workspace && typeof workspace.openSession === 'function') workspace.openSession(sessionId);
          } catch (error) {
            console.error('[turn-notifier] could not open the session', error);
          }
        },
      };

      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register(
          {
            name: 'shell.overlay',
            id: 'turn-notifier',
            order: 25,
            label: strings.region,
          },
          (slotProps) => h(Entry, Object.assign({}, slotProps, { tn }))
        )
      );

      ctx.slots.inject('plugins.bundle.config', () =>
        ctx.slots.register(
          {
            name: 'plugins.bundle.config',
            key: '@local/dsh-turn-notifier',
          },
          (slotProps) => h(SettingsPanel, Object.assign({}, slotProps, { strings }))
        )
      );
    }

    return { inject: ['slots'], apply };
  },
});
