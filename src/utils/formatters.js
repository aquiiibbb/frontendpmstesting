// Utility functions for GrandVista PMS ($ USD)

export const formatUSD = (amount) => {
  const numeric = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  } catch (e) {
    return String(dateString || '');
  }
};

export const formatShortDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (e) {
    return String(dateString || '');
  }
};

export const getDaysDifference = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays || 1;
};

export const calculateTaxes = (amount, taxRules = [], isTaxExempt = false) => {
  if (isTaxExempt) return { totalTax: 0, breakdown: [] };
  
  let totalTax = 0;
  const breakdown = [];

  taxRules.forEach(rule => {
    if (!rule.enabled) return;
    let taxAmount = 0;
    if (rule.type === 'percent') {
      taxAmount = (amount * rule.rate) / 100;
    } else if (rule.type === 'flat') {
      taxAmount = rule.rate;
    }
    totalTax += taxAmount;
    breakdown.push({
      id: rule.id,
      name: rule.name,
      rate: rule.rate,
      type: rule.type,
      amount: taxAmount
    });
  });

  return { totalTax, breakdown };
};

export const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'checked-in':
    case 'occupied':
    case 'clean':
      return 'badge-success';
    case 'reserved':
    case 'dirty':
      return 'badge-warning';
    case 'checked-out':
    case 'inspected':
      return 'badge-info';
    case 'out-of-order':
    case 'cancelled':
    case 'blocked':
      return 'badge-danger';
    default:
      return 'badge-secondary';
  }
};
