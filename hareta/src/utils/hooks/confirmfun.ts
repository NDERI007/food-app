export const formatCurrency = (amount: number) => {
  return `KSh ${amount.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getEstimatedDelivery = (orderDate: string) => {
  const date = new Date(orderDate);
  const now = new Date();
  const orderHour = date.getHours();

  // Same-day delivery for orders before 7 PM
  if (date.toDateString() === now.toDateString() && orderHour < 19) {
    return 'Today, within 30-60 minutes';
  }

  // Orders after 7 PM deliver next day morning
  const deliveryDate = new Date(date);
  if (orderHour >= 19) {
    deliveryDate.setDate(date.getDate() + 1);
    return `Tomorrow (${deliveryDate.toLocaleDateString('en-KE', {
      month: 'short',
      day: 'numeric',
    })}) by 10 AM`;
  }

  // For past orders, show next available slot
  deliveryDate.setDate(date.getDate() + 1);
  return `${deliveryDate.toLocaleDateString('en-KE', {
    month: 'short',
    day: 'numeric',
  })} by 10 AM`;
};
