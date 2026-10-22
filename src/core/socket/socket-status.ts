import { computed, effect, Signal, untracked } from '@angular/core';
import type { SocketStatus } from './socket.service';

/** All a component needs from the socket here (so tests can pass a bare `{ status }`). */
type StatusSource = { status: Signal<SocketStatus> };

/** The statuses in which the robot is not reachable. */
export const NOT_OPEN: readonly SocketStatus[] = ['connecting', 'closed'];

/** True while the socket is open. */
export const socketConnected = (socket: StatusSource): Signal<boolean> =>
  computed(() => socket.status() === 'open');

/**
 * Runs `reset` whenever the socket is in one of `statuses` (and once on creation if it already is):
 * the place to drop state that means nothing without a connection. Call it from an injection context.
 */
export const onSocketStatus = (
  socket: StatusSource,
  statuses: readonly SocketStatus[],
  reset: () => void,
): void => {
  effect(() => {
    if (statuses.includes(socket.status())) {
      untracked(reset);
    }
  });
};
