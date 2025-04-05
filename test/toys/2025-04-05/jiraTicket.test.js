import { describe, test, expect } from '@jest/globals';
import { jiraTicket } from '../../../src/toys/2025-04-05/jiraTicket.js';

describe('jiraTicket', () => {
  test('generates correct request for valid input', () => {
    const inputObj = {
      key: 'abc123',
      domain: 'mycompany.atlassian.net',
      user: 'user@example.com',
      ticket: 'JIRA-456'
    };
    const input = JSON.stringify(inputObj);
    const env = new Map();

    const result = JSON.parse(jiraTicket(input, env));
    const authHeader = Buffer.from(`${inputObj.user}:${inputObj.key}`).toString('base64');

    expect(result).toHaveProperty('request');
    expect(result.request).toMatchObject({
      method: 'GET',
      url: `https://${inputObj.domain}/rest/api/3/issue/${inputObj.ticket}`,
    });

    const headers = JSON.parse(result.request.headers);
    expect(headers).toMatchObject({
      Authorization: `Basic ${authHeader}`,
      Accept: 'application/json',
    });
  });
});
