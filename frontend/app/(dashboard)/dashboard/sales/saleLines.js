// Shared cart-line maths for the till, the draft review and adding items to a sale.
// A line is { productId, price, amount, quantity, cookInKitchen } with string values
// from the inputs. Weight items are keyed by KES amount; others by quantity.

export function isWeightProduct(product) {
  return (product?.saleMode || "WEIGHT") === "WEIGHT";
}

/** Whole shillings, rounded up. Cents are snapped first so float noise like 500.0000001 stays 500. */
export function roundUpKes(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.ceil(Math.round(amount * 100) / 100);
}

function kesAmount(value) {
  return String(roundUpKes(value));
}

export function priceFor(product, customer) {
  const retail = product?.defaultPrice ?? product?.pricePerUnit ?? 0;
  return customer?.type === "WHOLESALE" ? product?.wholesalePrice ?? retail : retail;
}

export function buildLine(product, customer) {
  const line = {
    productId: String(product.id),
    price: String(priceFor(product, customer)),
    amount: "",
    quantity: "",
    cookInKitchen: false,
  };
  if (isWeightProduct(product)) return line;
  line.quantity = "1";
  line.amount = kesAmount(1 * parseFloat(line.price || 0));
  return line;
}

export function emptyLine() {
  return { productId: "", amount: "", price: "", quantity: "", cookInKitchen: false };
}

/** Returns a new line after one input changes, keeping amount, price and quantity in step. */
export function changeLine(line, field, value, products, customer) {
  const item = { ...line };
  const currentProduct = products.find((p) => p.id === parseInt(item.productId, 10));

  if (field === "productId") {
    const product = products.find((p) => p.id === parseInt(value, 10));
    if (!product) return item;
    item.productId = value;
    item.price = priceFor(product, customer);
    if (!isWeightProduct(product)) item.cookInKitchen = false;
    if (isWeightProduct(product)) {
      const unitPrice = parseFloat(item.price || 0);
      if (item.amount != null && String(item.amount).trim() !== "") {
        const amount = parseFloat(item.amount || 0);
        item.quantity =
          unitPrice > 0 && Number.isFinite(amount) && amount > 0 ? (amount / unitPrice).toFixed(3) : "";
      } else if (item.quantity != null && String(item.quantity).trim() !== "") {
        const qty = parseFloat(item.quantity || 0);
        item.amount = qty > 0 && unitPrice > 0 ? kesAmount(qty * unitPrice) : "";
      }
    } else {
      const qty = parseFloat(item.quantity || 1);
      item.quantity = qty > 0 ? String(qty) : "1";
      item.amount = kesAmount((parseFloat(item.quantity || 1) || 1) * parseFloat(item.price || 0));
    }
    return item;
  }

  const weight = isWeightProduct(currentProduct);
  if (field === "amount") {
    item.amount = value;
    if (weight) {
      const amount = parseFloat(value || 0);
      const unitPrice = parseFloat(item.price || 0);
      item.quantity =
        String(value).trim() === "" || !Number.isFinite(amount) || amount <= 0 || unitPrice <= 0
          ? ""
          : (amount / unitPrice).toFixed(3);
    }
  } else if (field === "price") {
    item.price = value;
    const unitPrice = parseFloat(value || 0);
    if (weight) {
      if (item.amount && String(item.amount).trim() !== "") {
        const amount = parseFloat(item.amount || 0);
        item.quantity = unitPrice > 0 ? (amount / unitPrice).toFixed(3) : "";
      } else if (item.quantity && String(item.quantity).trim() !== "") {
        const qty = parseFloat(item.quantity || 0);
        item.amount = qty > 0 && unitPrice > 0 ? kesAmount(qty * unitPrice) : "";
      }
    } else {
      const qty = parseFloat(item.quantity || 0);
      item.amount = qty > 0 ? kesAmount(qty * unitPrice) : "";
    }
  } else if (field === "quantity") {
    item.quantity = value;
    const qty = parseFloat(value || 0);
    const unitPrice = parseFloat(item.price || 0);
    if (weight) {
      item.amount =
        String(value).trim() === "" || !Number.isFinite(qty) || qty <= 0 || unitPrice <= 0
          ? ""
          : kesAmount(qty * unitPrice);
    } else {
      item.amount = qty > 0 && Number.isFinite(qty) ? kesAmount(qty * unitPrice) : "";
    }
  } else {
    item[field] = value;
  }
  return item;
}

/** Re-prices every line when the customer changes (wholesale vs retail). */
export function repriceLines(lines, products, customer) {
  return lines.map((line) => {
    const product = products.find((p) => p.id === parseInt(line.productId, 10));
    if (!product) return line;
    const newPrice = priceFor(product, customer);
    if (isWeightProduct(product)) {
      const amountNum = parseFloat(line.amount || 0);
      const qtyNum = parseFloat(line.quantity || 0);
      if (line.amount !== "" && line.amount != null && amountNum > 0 && newPrice > 0) {
        return { ...line, price: String(newPrice), quantity: (amountNum / newPrice).toFixed(3) };
      }
      if (line.quantity !== "" && line.quantity != null && qtyNum > 0 && newPrice > 0) {
        return { ...line, price: String(newPrice), amount: kesAmount(qtyNum * newPrice) };
      }
      return { ...line, price: String(newPrice) };
    }
    const quantity = parseFloat(line.quantity || 0);
    const amount = quantity > 0 ? kesAmount(quantity * newPrice) : line.amount;
    return { ...line, price: String(newPrice), amount };
  });
}

export function lineQuantity(line, product) {
  const quantity = parseFloat(line.quantity || 0);
  const unitPrice = parseFloat(line.price || 0);
  if (isWeightProduct(product) && unitPrice > 0) {
    return parseFloat(line.amount || 0) / unitPrice;
  }
  return quantity;
}

export function lineCookingFee(line, product, cookingFeePerKg) {
  if (!line.cookInKitchen || !isWeightProduct(product)) return 0;
  return roundUpKes(lineQuantity(line, product) * Number(cookingFeePerKg || 0));
}

export function linesTotal(lines, products, cookingFeePerKg) {
  return lines.reduce((sum, line) => {
    const product = products.find((p) => p.id === parseInt(line.productId, 10));
    return sum + roundUpKes(line.amount || 0) + lineCookingFee(line, product, cookingFeePerKg);
  }, 0);
}

/** First problem with the lines, or null when they can be sent. */
export function validateLines(lines) {
  if (lines.length === 0) return "Please add at least one item to the sale";
  for (const line of lines) {
    if (!line.productId || !line.amount || !line.price || !line.quantity) {
      return "Please fill in all fields for all items";
    }
    if (parseFloat(line.quantity) <= 0) {
      return "Invalid quantity calculated. Please check the amount and price.";
    }
  }
  return null;
}

export function lineToPayload(line, product) {
  return {
    productId: parseInt(line.productId, 10),
    quantity: lineQuantity(line, product),
    unitPrice: parseFloat(line.price || 0),
    cookInKitchen: !!line.cookInKitchen && isWeightProduct(product),
  };
}

export function formatKes(value) {
  return roundUpKes(value).toLocaleString("en-KE", { maximumFractionDigits: 0 });
}
