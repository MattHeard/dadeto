/**
 *
 * @param input
 * @param env
 */
export function generatePalette(input, env) {
  const getRand = env.get('getRandomNumber');
  const count = Number(input) || 5;
  const pad2 = n => n.toString(16).padStart(2, '0');
  const colors = Array.from({ length: count }, () => {
    const value = Math.floor(getRand() * 256);
    return `#${pad2(value)}${pad2(value)}${pad2(value)}`;
  });
  return JSON.stringify({ palette: colors });
}
