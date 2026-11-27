export const PURCHASE_STATUS = {
  draft: { label: 'Draf', tone: 'muted' },
  dipesan: { label: 'Dipesan', tone: 'warn' },
  diterima: { label: 'Diterima', tone: 'success' },
  batal: { label: 'Dibatalkan', tone: 'danger' },
};

export const purchaseStatusLabel = (status) => PURCHASE_STATUS[status]?.label || status;
export const purchaseStatusTone = (status) => PURCHASE_STATUS[status]?.tone || 'muted';
