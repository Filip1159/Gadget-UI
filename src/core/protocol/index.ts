/** Wire protocol shared with the robot firmware (plain space-delimited text, see CLAUDE.md). */
export * from './types';
export { encodeCommand } from './encode';
export { parseMessage } from './parse';
