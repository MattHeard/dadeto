import { startSupplyChainNowcastingPage } from '/core/browser/game/supply-chain-nowcasting/page.js';

startSupplyChainNowcastingPage({
  documentObj: document,
  dataAdapters: {
    readFileTextFn: file => file.text(),
    downloadPlanFn: plan => downloadPlan(plan),
  },
});

function downloadPlan(plan) {
  const blob = new Blob([JSON.stringify(plan, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'supply-chain-response-plan.json';
  link.click();
  URL.revokeObjectURL(url);
}
