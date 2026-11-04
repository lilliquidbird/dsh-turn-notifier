/**
 * Host half of the completion-notifier bundle.
 *
 * All behaviour lives in the Client module: it observes the live session
 * catalog through the `shell.overlay` slot props, so no Host state is needed.
 * This entry keeps the bundle patch valid and leaves room for later Host-side
 * work such as native notifications.
 */
export function apply() {}
