export const unitPrice = (item, options) =>
  Number(item.price) +
  (item.size === "L" ? options.largeSizePrice : 0) +
  item.extras.reduce(
    (sum, name) =>
      sum + (options.extras.find((x) => x.name === name)?.price || 0),
    0,
  );
