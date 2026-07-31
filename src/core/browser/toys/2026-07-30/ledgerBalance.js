/**
 * Return the signed balance represented by a ledger of transactions.
 * @param {Array<{amount: number}>} transactions Ledger transactions.
 * @returns {number} Sum of the transaction amounts.
 */
export function ledgerBalance(transactions) {
  return transactions.reduce(
    (balance, transaction) => balance + transaction.amount,
    0
  );
}
