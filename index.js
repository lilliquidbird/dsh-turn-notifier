/**
 * Host half of the completion / question notifier.
 *
 * The Client half draws the in-app card. This half owns the *system* alert:
 * it watches committed session events and asks Windows to show a real toast,
 * so the alert still appears while the GUI is hidden, minimised, or in the
 * background. `toast.ps1` skips the toast when the DSH window is already in
 * front, where the in-app card is the better surface.
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = join(dirname(fileURLToPath(import.meta.url)), 'toast.ps1');
const IS_WINDOWS = process.platform === 'win32';

/** Fire-and-forget: a failed toast must never disturb the agent loop. */
function showToast(title, body) {
  if (!IS_WINDOWS) return;
  try {
    const child = spawn(
      'powershell.exe',
      [
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
      ],
      { windowsHide: true, stdio: 'ignore' }
    );
    child.on('error', () => {});
    if (typeof child.unref === 'function') child.unref();
  } catch (error) {
    /* ignore: notification is best effort */
  }
}

function sessionTitle(ctx, session) {
  try {
    const snapshot = ctx.sessionTitle.get(session);
    if (snapshot && typeof snapshot.title === 'string' && snapshot.title.trim() !== '') {
      return snapshot.title.trim();
    }
  } catch (error) {
    /* fall through to the id prefix */
  }
  return String(session && session.id ? session.id : '').slice(0, 8);
}

function isRootSession(session) {
  const header = session && session.header;
  if (!header) return false;
  if (header.origin === 'subagent') return false;
  if (header.parentSession !== undefined && header.parentSession !== null) return false;
  return true;
}

export function apply(ctx) {
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
        if (!reason || reason.kind !== 'completed') return;
        if (!isRootSession(session)) return;
        if (!claim('done:' + session.id, 3000)) return;
        showToast(sessionTitle(ctx, session), '任务已完成');
      } catch (error) {
        /* never break the event feed */
      }
    })
  );

  ctx.effect(() =>
    ctx.on('user-questions/request', (request, next) => {
      try {
        const agent = request && request.agent;
        const session = agent ? ctx.sessions.get(agent.id) : undefined;
        if (session && isRootSession(session) && claim('ask:' + session.id, 1500)) {
          const questions = Array.isArray(request.questions) ? request.questions : [];
          const first = questions[0];
          const text =
            first && typeof first.question === 'string' && first.question.trim() !== ''
              ? first.question.trim()
              : '需要你回答';
          showToast('需要你回答', text);
        }
      } catch (error) {
        /* a toast failure must not block the question */
      }
      return next();
    })
  );
}
