# Acceptance Criteria

## Machine-Checkable Criteria
- [ ] `npm test` exits with status 0.
- [ ] `npm run build` exits with status 0.
- [ ] `node --input-type=module -e "import('./src/core/browser/toys/2026-04-03/realHourlyWage.js').then(({ calculateRealHourlyWage }) => console.log(calculateRealHourlyWage({ period: { paidWorkHours: 160, grossIncome: 5000, netIncome: 3200 }, overhead: { commuteHours: 20, prepHours: 5, recoveryHours: 10, adminHours: 4, overtimeHours: 2, otherWorkHours: 1, directWorkExpenses: 120, commuteExpenses: 40, foodExpenses: 15, clothingExpenses: 25, otherWorkExpenses: 10 } }).realHourlyWage))"` prints `14.988235294117647`.

## Evidence Collection
- Command log path: `artifacts/toys/real-hourly-wage/commands.log`
- Generated artifacts:
  - `public/index.html`
  - `public/core/browser/toys/2026-04-03/realHourlyWage.js`
- Test report path (if applicable): `artifacts/toys/real-hourly-wage/test-report.txt`

## Pass/Fail Rules
- Pass when the command checklist above succeeds and the toy test covers the pure calculator and wrapper validation cases.
- Fail when the calculator output changes unexpectedly, the wrapper stops returning JSON, or the build/test commands fail.
