export const formatPrice = (price) => {
  if (isNaN(price)) return "0 ₫";
  return (
    price.toLocaleString("it-IT", { style: "currency", currency: "VND" }) + " ₫"
  );
};
