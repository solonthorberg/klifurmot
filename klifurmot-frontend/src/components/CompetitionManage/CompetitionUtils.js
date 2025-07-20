export function generateKey() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export function reorderList(list, startIndex, endIndex) {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}
