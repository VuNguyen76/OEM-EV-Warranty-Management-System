const warrantyStatus = (warranty_end) => {
  const now = new Date();
  const endDate = new Date(warranty_end);
  return endDate >= now ? "Còn hiệu lực" : "Hết hạn";
};
export default warrantyStatus;