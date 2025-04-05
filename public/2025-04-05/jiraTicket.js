function base64Encode(str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes = new TextEncoder().encode(str);
  let result = '', i;

  for (i = 0; i < bytes.length; i += 3) {
    const [a, b = 0, c = 0] = bytes.slice(i, i + 3);
    const triple = (a << 16) + (b << 8) + c;

    result += chars[(triple >> 18) & 0x3F];
    result += chars[(triple >> 12) & 0x3F];
    result += i + 1 < bytes.length ? chars[(triple >> 6) & 0x3F] : '=';
    result += i + 2 < bytes.length ? chars[triple & 0x3F] : '=';
  }

  return result;
}

export function jiraTicket(input, env) {
  const { key, domain, user, ticket } = JSON.parse(input);

  const auth = base64Encode(`${user}:${key}`);
  const request = {
    method: "GET",
    url: `https://${domain}/rest/api/3/issue/${ticket}`,
    headers: JSON.stringify({
      "Authorization": `Basic ${auth}`,
      "Accept": "application/json"
    })
  };

  return JSON.stringify({ request });
}
