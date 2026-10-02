import { expect, test } from '@playwright/test';

test('an agent plays the visible game through WebMCP and restores its save', async ({ page }) => {
  await page.addInitScript(() => {
    const tools: Record<string, any> = {};
    (window as any).mosslightAgentTools = tools;
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool: (tool: any, options?: object) => {
          if (options !== undefined && (options === null || typeof options !== 'object')) {
            throw new TypeError('Invalid registerTool options value');
          }
          tools[tool.name] = tool;
        },
        unregisterTool: (name: string) => { delete tools[name]; },
      },
    });
  });
  await page.goto('/mosslight-valley/');
  await expect.poll(() => page.evaluate(() => Object.keys((window as any).mosslightAgentTools).length)).toBe(4);
  const result = await page.evaluate(() => {
    const tools = (window as any).mosslightAgentTools;
    const read = (response: any) => JSON.parse(response.content[0].text);
    const before = read(tools.mosslight_observe.execute()).state;
    const after = read(tools.mosslight_act.execute({ actions: ['right', 'right'] })).state;
    const save = read(tools.mosslight_export_save.execute()).save;
    let refused = false;
    try { tools.mosslight_act.execute({ actions: ['left', 'teleport'] }); }
    catch { refused = true; }
    const afterInvalid = read(tools.mosslight_export_save.execute()).save;
    tools.mosslight_act.execute({ actions: ['left'] });
    const restored = read(tools.mosslight_import_save.execute({ save })).state;
    const local = JSON.parse(localStorage.getItem('permanentData') || '{}');
    const story = read(tools.mosslight_act.execute({
      actions: ['left', 'up', 'interact', 'confirm', 'confirm'],
    })).state;
    return { before, after, refused, save, afterInvalid, restored,
      story, persisted: local['mosslight-valley-saves-v2'].slots['0'] };
  });
  expect(result.after.world.player.x).toBe(result.before.world.player.x + 2);
  expect(result.after.tick).toBe(result.before.tick + 4);
  expect(result.refused).toBe(true);
  expect(result.afterInvalid).toBe(result.save);
  expect(result.restored).toEqual(result.after);
  expect(result.persisted).toBe(result.save);
  expect(result.story.world.flags.miraTrust).toBe(1);
  expect(result.story.world.relationships.mira).toBe(1);
  await expect(page.locator('#game-status')).toContainText(result.after.world.map.name);
  await page.waitForTimeout(300);
  const pausedTick = await page.evaluate(() => JSON.parse((window as any).mosslightAgentTools.mosslight_observe.execute().content[0].text).state.tick);
  expect(pausedTick).toBe(result.story.tick);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse((window as any).mosslightAgentTools.mosslight_observe.execute().content[0].text).state.tick)).toBeGreaterThan(pausedTick);
});
