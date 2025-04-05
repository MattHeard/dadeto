export function jiraTicket(input, env) {
  const { key, domain, user, ticket } = JSON.parse(input);

  const auth = Buffer.from(`${user}:${key}`).toString('base64');
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
