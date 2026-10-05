import { createNeonState } from '../../../../src/core/browser/game/neon-covenant/simulation.js';
import {
  endShift,
  manageLab,
} from '../../../../src/core/browser/game/neon-covenant/management.js';
import { NEON_CAMPAIGN_ROUTES as ROUTES } from '../../../helpers/neonCampaignRoutes.js';

/**
 * Complete a distinct route through real orders, evidence and settlements.
 * @param {Record<string, any>} route Authored strategic route.
 * @returns {Record<string, any>} Resolved 28-shift campaign.
 */
function playRoute(route) {
  let state = createNeonState();
  const order = command => {
    state = manageLab(state, command);
    expect(state.toast).not.toMatch(/rejected|No decision points|Unknown/);
  };
  order('cooling');
  order(`focus:${route.project}`);
  route.orders.forEach(order);
  order(route.contract);
  let released = false;
  for (let shift = 1; shift <= 28 && !state.lab.outcome; shift++) {
    const target = { atlas: 38, ghost: 64, lumen: 48 }[route.project];
    if (!released && state.lab.research[route.project] >= target) {
      for (const probe of ['reliability', 'rights', 'oversight'])
        order(`test:probe:${probe}`);
      order('deploy');
      released = state.lab.deployed.includes(route.project);
    }
    if (released && shift >= 12)
      state.lab.employees
        .filter(person => person.role === 'research')
        .forEach(person => order(`assign:${person.id}:service`));
    if (released && state.lab.deployments[route.project].maintenance < 78)
      order(`service:maintain:${route.project}`);
    state = endShift(state);
  }
  return state;
}

test.each(ROUTES)('$name is solvent under actual campaign rules', route => {
  const state = playRoute(route);
  const { lab } = state;

  expect(state.world.day).toBe(29);
  expect(lab.outcome).toBe('independent');
  expect(lab.cash).toBeGreaterThan(lab.debt);
  expect(lab.incidents).toBe(0);
  expect(lab.deployed).toContain(route.project);
  expect(lab.fulfilled).toContain(route.contract.split(':')[1]);
  expect(lab.expired).toEqual([]);
  expect(lab.stakeholderStanding[route.standing]).toBeGreaterThan(
    route.minimumStanding
  );
  if (route.promise)
    expect(lab.relationships[route.promise].stage).toBe('fulfilled');
});

test('the four solvent routes trade cash against distinct stakeholder outcomes', () => {
  const outcomes = ROUTES.map(playRoute);
  const clinical = outcomes[0].lab;
  const publicRoute = outcomes[1].lab;
  const efficient = outcomes[2].lab;
  const autonomy = outcomes[3].lab;

  expect(clinical.stakeholderStanding.clinic).toBeGreaterThan(
    efficient.stakeholderStanding.clinic
  );
  expect(publicRoute.stakeholderStanding.transit).toBeGreaterThan(
    clinical.stakeholderStanding.transit
  );
  expect(autonomy.cash).toBeGreaterThan(publicRoute.cash);
  expect(autonomy.trust).toBeLessThan(publicRoute.trust);
  expect(efficient.contractTerms.clinic).toBe('balanced');
  expect(clinical.contractTerms.clinic).toBe('community');
  expect(autonomy.contractTerms.helios).toBe('community');
});
