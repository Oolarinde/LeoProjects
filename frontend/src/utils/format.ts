export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatNairaDecimal(amount: number | string): string {
  return (
    "\u20A6" +
    Number(amount).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export const PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "POS",
  "Mobile Transfer",
  "Cheque",
] as const;

export const EXPENSE_CATEGORIES = [
  "Salaries",
  "Construction",
  "Maintenance",
  "Utilities",
  "Inventory",
  "Administrative",
  "Loans & Advances",
  "Transportation",
  "IT & Communications",
  "Other",
] as const;
