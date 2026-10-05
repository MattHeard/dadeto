import { createLab } from '../../../../src/core/browser/game/neon-covenant/management.js';
import { campaignEpilogue } from '../../../../src/core/browser/game/neon-covenant/epilogue.js';

const CLOSINGS = [
  ['insolvent', [], 'creditors take control'],
  ['acquired', ['atlas'], 'Helios takes the keys'],
  ['gilded-cage', ['atlas'], 'restrictions earned by its record'],
  [
    'city-covenant',
    ['atlas', 'lumen'],
    'clinic and transit union share ownership',
  ],
  ['independent', ['atlas'], 'keeps the keys without a new outside owner'],
  ['quiet-lab', [], 'keeps the keys without a new outside owner'],
];

test.each(CLOSINGS)(
  '%s epilogue reflects its ledger and actual ownership terms',
  (outcome, releases, ownership) => {
    const lab = createLab();
    lab.deployed = releases;
    lab.employees[0].role = 'service';
    lab.morale = 61;
    lab.incidents = 2;
    lab.debt = 73;
    lab.stakeholderStanding.investor = 91;

    const text = campaignEpilogue(outcome, lab);

    expect(text).toContain(
      releases.length ? 'Atlas / triage' : 'no model released'
    );
    expect(text).toContain('Ada / service');
    expect(text).toContain('morale 61/100');
    expect(text).toContain('Investor has the strongest standing at 91/100');
    expect(text).toContain('records 2 incident(s)');
    expect(text).toContain('Debt at the ownership hearing: 73k');
    expect(text).toContain(ownership);
  }
);

test('a signed rescue preserves its negotiated ownership term in the epilogue', () => {
  const lab = createLab();
  lab.rescueFinancing = { id: 'clinicCovenant', signedShift: 4 };

  expect(campaignEpilogue('independent', lab)).toContain(
    'Clinic cooperative note ownership terms remain active.'
  );
});
