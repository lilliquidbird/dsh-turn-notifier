/**
 * Host half of the completion / question / approval notifier.
 *
 * The Client half draws the in-app card. This half owns every *system* alert
 * that has to survive the page being hidden or throttled: it watches committed
 * session events, approval / question waterfalls and background-job settlement,
 * then asks Windows to show a real toast. `toast.ps1` stays quiet when the DSH
 * window is already in front, where the in-app surface is the better one.
 *
 * Services are read through `ctx.get(...)` rather than injected properties:
 * Cordis throws on an uninjected `ctx.sessions` lookup, and a plugin that must
 * never break the agent loop cannot afford that throw on a hot path.
 */
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_DIR = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = join(PLUGIN_DIR, 'toast.ps1');
const IS_WINDOWS = process.platform === 'win32';
const STATE_DIR = join(tmpdir(), 'dsh-turn-notifier');

function pluginVersion() {
  try {
    return JSON.parse(readFileSync(join(PLUGIN_DIR, 'package.json'), 'utf8')).version || 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

/** Boot marker + event trace, so the host half can be verified without a UI. */
function trace(entry) {
  try {
    mkdirSync(STATE_DIR, { recursive: true });
    appendFileSync(join(STATE_DIR, 'events.jsonl'), JSON.stringify(entry) + '\n');
  } catch (error) {
    /* diagnostics are best effort */
  }
}

function markBoot() {
  try {
    mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(
      join(STATE_DIR, 'host-boot.json'),
      JSON.stringify({ pid: process.pid, at: new Date().toISOString(), version: pluginVersion() })
    );
  } catch (error) {
    /* ignore */
  }
}

/** Fire-and-forget: a failed toast must never disturb the agent loop. */
function showToast(title, body, options) {
  const opts = options || {};
  const kind = opts.kind || 'done';
  if (!IS_WINDOWS) return;
  trace({ at: new Date().toISOString(), kind });
  try {
    const args = [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-WindowStyle',
      'Hidden',
      '-File',
      SCRIPT_PATH,
      '-Title',
      String(title || '').slice(0, 120),
      '-Body',
      String(body || '').slice(0, 200),
    ];
    if (opts.sound === true) args.push('-Sound');
    const child = spawn('powershell.exe', args, { windowsHide: true, stdio: 'ignore' });
    child.on('error', () => {});
    if (typeof child.unref === 'function') child.unref();
  } catch (error) {
    /* notification is best effort */
  }
}

function isRootSession(session) {
  const header = session && session.header;
  if (!header) return false;
  if (header.origin === 'subagent') return false;
  if (header.parentSession !== undefined && header.parentSession !== null) return false;
  return true;
}

function localizedReason(displayReason, fallback) {
  if (displayReason && typeof displayReason === 'object') {
    if (typeof displayReason.zh === 'string' && displayReason.zh.trim() !== '') return displayReason.zh.trim();
    if (typeof displayReason.en === 'string' && displayReason.en.trim() !== '') return displayReason.en.trim();
  }
  if (typeof fallback === 'string' && fallback.trim() !== '') return fallback.trim();
  return '需要你确认后才能继续';
}

export function apply(ctx) {
  markBoot();
  trace({ at: new Date().toISOString(), kind: 'boot', version: pluginVersion() });

  const service = (name) => {
    try {
      return typeof ctx.get === 'function' ? ctx.get(name) : undefined;
    } catch (error) {
      return undefined;
    }
  };

  const sessions = service('sessions');
  const titles = service('sessionTitle');
  const jobs = service('jobs');

  const findSession = (agent) => {
    try {
      if (!sessions || !agent) return undefined;
      return sessions.get(agent.id);
    } catch (error) {
      return undefined;
    }
  };

  const titleOf = (session) => {
    try {
      const snapshot = titles ? titles.get(session) : undefined;
      if (snapshot && typeof snapshot.title === 'string' && snapshot.title.trim() !== '') {
        return snapshot.title.trim();
      }
    } catch (error) {
      /* fall through to the id prefix */
    }
    return String(session && session.id ? session.id : '').slice(0, 8);
  };

  const recent = new Map();

  /** Suppress duplicates that arrive through more than one event edge. */
  const claim = (key, windowMs) => {
    const now = Date.now();
    const previous = recent.get(key);
    if (previous !== undefined && now - previous < windowMs) return false;
    recent.set(key, now);
    if (recent.size > 64) {
      for (const [entryKey, at] of recent) {
        if (now - at > 60_000) recent.delete(entryKey);
      }
    }
    return true;
  };

  ctx.effect(() =>
    ctx.on('session/event', (session, event) => {
      try {
        if (!event || event.type !== 'turn/end') return;
        const reason = event.data && event.data.reason;
        const kind = reason && reason.kind;
        if (kind !== 'completed' && kind !== 'error') return;
        if (!isRootSession(session)) return;
        if (!claim('turn:' + session.id, 3000)) return;
        if (kind === 'completed') {
          showToast(titleOf(session), '任务已完成', { kind: 'done' });
        } else {
          showToast(titleOf(session), '任务出错了，需要你看一眼', { kind: 'error', sound: true });
        }
      } catch (error) {
        /* never break the event feed */
      }
    })
  );

  ctx.effect(() =>
    ctx.on('approval/request', (request, next) => {
      try {
        const agent = request && request.agent;
        const session = findSession(agent);
        const key = 'approval:' + (agent ? agent.id : '?') + ':' + String((request && request.callId) || '');
        if (session && isRootSession(session) && claim(key, 1500)) {
          showToast('需要你确认', localizedReason(request && request.displayReason, request && request.reason), {
            kind: 'approval',
            sound: true,
          });
        }
      } catch (error) {
        /* a toast failure must not block the approval */
      }
      return next();
    })
  );

  ctx.effect(() =>
    ctx.on('user-questions/request', (request, next) => {
      try {
        const agent = request && request.agent;
        const session = findSession(agent);
        if (session && isRootSession(session) && claim('ask:' + session.id, 1500)) {
          const questions = Array.isArray(request.questions) ? request.questions : [];
          const first = questions[0];
          const text =
            first && typeof first.question === 'string' && first.question.trim() !== ''
              ? first.question.trim()
              : '需要你回答';
          showToast('需要你回答', text, { kind: 'question', sound: true });
        }
      } catch (error) {
        /* a toast failure must not block the question */
      }
      return next();
    })
  );

  /*
   * Background jobs outlive the turn that started them, so a settled job would
   * otherwise finish silently. Mirror the job registry's feed and report it.
   */
  if (jobs && jobs.events && typeof jobs.events.subscribe === 'function') {
    ctx.effect(() =>
      jobs.events.subscribe({ owners: 'all' }, (event) => {
        try {
          if (!event || event.type !== 'settled' || !event.job) return;
          const view = event.job;
          if (!claim('job:' + view.id, 5000)) return;
          const failed = view.status === 'failed' || view.status === 'killed';
          showToast(
            String(view.label || '后台任务').slice(0, 80),
            failed ? '后台任务失败或被停止' : '后台任务已完成',
            { kind: 'job', sound: failed }
          );
        } catch (error) {
          /* never break the job feed */
        }
      })
    );
  }
}
