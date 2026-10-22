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

  const orderNotes = sale?.restaurantOrder?.notes;
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
  const kitchenItems = items
    .map((item) => {
      const qty = formatQty(item.quantity);
      const unit = item.product?.unit || "";
      const name = item.product?.name || "Item";
      return `<div class="item">- ${esc(qty)} ${esc(name)} ${esc(unit)}</div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title></title>
  <style>
    /* Chrome drops "80mm auto", then prints a full Letter page: long blank
       paper, the URL over the title, and the date/page line at the bottom.
       The real height is written in just before print. Zero margin removes
       that header and footer slot. */
    @page { margin: 0; }
    * { box-sizing: border-box; color: #000; }
    html, body {
      width: 72mm;
      height: auto;
      min-height: 0;
      margin: 0;
      padding: 0;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .slip {
      width: 72mm;
      margin: 0;
      padding: 2mm 2.5mm 3mm;
      background: #fff;
      color: #000;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.3;
      -webkit-font-smoothing: none;
      -webkit-text-stroke: 0.25px #000;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    #kitchen { page: kitchen; break-after: page; page-break-after: always; }
    #bill { page: customer; }
    #kitchen .item { font-size: 16px; }
    .center { text-align: center; }
    .title { font-size: 15px; letter-spacing: 0.5px; }
    .house { font-size: 16px; margin-top: 4px; }
    .rule { border: 0; border-top: 2px solid #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .row span:last-child { font-variant-numeric: tabular-nums; text-align: right; }
    .item { margin-bottom: 5px; }
    .prices { display: flex; justify-content: flex-end; gap: 12px; font-variant-numeric: tabular-nums; }
    .thanks { text-align: center; margin-top: 2px; }
  </style>
</head>
<body>
  <div id="kitchen" class="slip">
    <div class="center title">KITCHEN</div>
    <div class="row"><span>Ticket</span><span>${esc(sale?.saleNumber || "")}</span></div>
    <div class="row"><span>Time</span><span>${esc(timePart)}</span></div>
    ${table ? `<div class="row"><span>Table</span><span>${esc(table)}</span></div>` : ""}
    <hr class="rule" />
    ${kitchenItems}
    ${orderNotes ? `<div class="item">${esc(orderNotes)}</div>` : ""}
  </div>
  <div id="bill" class="slip">
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
    <div class="row"><span>Total</span><span>${esc(formatMoney(sale?.totalAmount))}</span></div>
    <div class="row"><span>Payment</span><span>${esc(method)}</span></div>
    <div class="row"><span>Status</span><span>${paid ? "PAID" : "UNPAID"}</span></div>
    ${mpesa ? `<div class="row"><span>M-Pesa</span><span>${esc(mpesa)}</span></div>` : ""}
    <hr class="rule" />
    <div class="thanks">THANK YOU &amp; WELCOME AGAIN.</div>
  </div>
  <script>
    window.onload = function () {
      function mm(el) {
        return Math.ceil(el.offsetHeight * 25.4 / 96) + 1;
      }
      var kitchen = document.getElementById("kitchen");
      var bill = document.getElementById("bill");
      var style = document.createElement("style");
      style.textContent =
        "@page kitchen { size: 72mm " + mm(kitchen) + "mm; margin: 0; }" +
        "@page customer { size: 72mm " + mm(bill) + "mm; margin: 0; }";
      document.head.appendChild(style);
      setTimeout(function () { window.print(); }, 80);
      window.onafterprint = function () {
        var frame = window.frameElement;
        if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
      };
    };
  </script>
</body>
</html>`;
}
