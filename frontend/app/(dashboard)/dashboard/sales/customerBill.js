function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function billWhen(soldAt) {
  const date = soldAt ? new Date(soldAt) : new Date();
  const datePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return { datePart, timePart };
}

function formatQty(value) {
  const qty = Number(value);
  if (!Number.isFinite(qty)) return "0";
  return qty.toLocaleString("en-KE", { maximumFractionDigits: 3 });
}

function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0.00";
  return amount.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function buildCustomerBillDocument(sale) {
  const { datePart, timePart } = billWhen(sale?.soldAt);
  const branch = sale?.branch?.name || "LakeTown Butchery";
  const servedBy = sale?.soldBy?.username || sale?.soldBy?.email || "Cashier";
  const customer = sale?.customer?.name || "Walk-in";
  const table = sale?.restaurantOrder?.tableLabel;
  const paid = sale?.paymentStatus === "PAID";
  const method = sale?.paymentMethod || "CASH";
  const mpesa = sale?.payment?.mpesaReference;
  const items = Array.isArray(sale?.items) ? sale.items : [];

  const itemHtml = items
    .map((item) => {
      const qty = formatQty(item.quantity);
      const unit = item.product?.unit || "";
      const name = item.product?.name || "Item";
      const unitPrice = formatMoney(item.unitPrice);
      const lineTotal = formatMoney(item.totalPrice ?? Number(item.quantity) * Number(item.unitPrice || 0));
      return `
        <div class="item">
          <div>- ${esc(qty)} ${esc(name)} ${esc(unit)}</div>
          <div class="prices"><span>@${esc(unitPrice)}</span><span>${esc(lineTotal)}</span></div>
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Customer bill ${esc(sale?.saleNumber || "")}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; }
    body {
      width: 72mm;
      margin: 0 auto;
      color: #000;
      background: #fff;
      font-family: "Courier New", ui-monospace, monospace;
      font-size: 12px;
      line-height: 1.45;
    }
    .center { text-align: center; }
    .title { font-weight: 700; letter-spacing: 2px; }
    .house { font-weight: 700; font-size: 14px; margin-top: 8px; }
    .rule { border: 0; border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; gap: 12px; }
    .row span:last-child { font-variant-numeric: tabular-nums; }
    .item { margin-bottom: 6px; }
    .prices { display: flex; justify-content: flex-end; gap: 16px; font-variant-numeric: tabular-nums; }
    .total { font-weight: 700; }
    .thanks { text-align: center; font-weight: 700; letter-spacing: 1px; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="center title">CUSTOMER BILL</div>
  <div class="center house">LAKETOWN BUTCHERY</div>
  <div class="center">${esc(branch)}</div>
  <hr class="rule" />
  <div class="row"><span>Date</span><span>${esc(datePart)}</span></div>
  <div class="row"><span>Time</span><span>${esc(timePart)}</span></div>
  <div class="row"><span>Served by</span><span>${esc(servedBy)}</span></div>
  ${table ? `<div class="row"><span>Table</span><span>${esc(table)}</span></div>` : ""}
  <div class="row"><span>Customer</span><span>${esc(customer)}</span></div>
  <div class="row"><span>Ticket</span><span>${esc(sale?.saleNumber || "")}</span></div>
  <hr class="rule" />
  ${itemHtml}
  <hr class="rule" />
  <div class="row total"><span>Total</span><span>${esc(formatMoney(sale?.totalAmount))}</span></div>
  <div class="row"><span>Payment</span><span>${esc(method)}</span></div>
  <div class="row"><span>Status</span><span>${paid ? "PAID" : "UNPAID"}</span></div>
  ${mpesa ? `<div class="row"><span>M-Pesa</span><span>${esc(mpesa)}</span></div>` : ""}
  <hr class="rule" />
  <div class="thanks">THANK YOU &amp; WELCOME AGAIN.</div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 150); };</script>
</body>
</html>`;
}
