/** Wire protocol shared with the robot firmware (plain space-delimited text, see CLAUDE.md). */
export * from './protocol/types';
export { encodeCommand } from './protocol/encode';
export { parseMessage } from './protocol/parse';
