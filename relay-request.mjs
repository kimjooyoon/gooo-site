// Shape conversion only: no stale-turn, movement, or execution authorization.
export function toGoooRequest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== 'action,direction,run_id,turn') {
    throw new TypeError('REQUEST_SHAPE_INVALID');
  }
  if (typeof value.run_id !== 'string' || value.run_id.length === 0 ||
      !Number.isSafeInteger(value.turn) || value.turn < 0 ||
      !['observe', 'move'].includes(value.action) || !['N', 'E', 'S', 'W'].includes(value.direction)) {
    throw new TypeError('REQUEST_VALUE_INVALID');
  }
  return Object.freeze({RunID:value.run_id, Turn:String(value.turn), Action:value.action, Direction:value.direction});
}
