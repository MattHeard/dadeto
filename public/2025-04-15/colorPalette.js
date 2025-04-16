export function generatePalette(input, env) {
  const getRand = env.get("getRandomNumber");
  const count = Number(input) || 5;
  const pad2 = n => n.toString(16).padStart(2, "0");
  const colors = Array.from({ length: count }, () => {
    const r = Math.floor(getRand() * 256);
    const g = Math.floor(getRand() * 256);
    const b = Math.floor(getRand() * 256);
    return `#${pad2(r)}${pad2(g)}${pad2(b)}`;
  });
  return JSON.stringify({ palette: colors });
}
