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

export function buildCustomerBillDocument(sale, kind = "customer") {
  const { datePart, timePart } = billWhen(sale?.soldAt);
  const branch = sale?.branch?.name || "LakeTown Butchery";
  const servedBy = sale?.soldBy?.username || sale?.soldBy?.email || "Cashier";
  const customer = sale?.customer?.name || "Walk-in";
  const table = sale?.restaurantOrder?.tableLabel;
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
          <div>${esc(name)}</div>
          <div class="prices"><span>${esc(qty)} ${esc(unit)}</span><span>@${esc(unitPrice)}</span><span>${esc(lineTotal)}</span></div>
        </div>`;
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
      font-size: 13px;
      font-weight: 400;
      line-height: 1.35;
    }
    .center { text-align: center; }
    .title, .house { font-weight: 700; }
    .title { font-size: 15px; }
    .house { font-size: 14px; margin-top: 2px; }
    .rule { border: 0; border-top: 1px solid #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .row span:last-child { font-variant-numeric: tabular-nums; text-align: right; }
    .item { margin-bottom: 5px; }
    .prices { display: flex; justify-content: flex-end; gap: 12px; font-variant-numeric: tabular-nums; }
    .thanks { text-align: center; margin-top: 2px; }
    .credit { text-align: center; margin-top: 6px; font-size: 11px; }
  </style>
</head>
<body>
  ${kind === "kitchen" ? `<div id="slip" class="slip">
    <div class="center title">KITCHEN</div>
    <div class="center house">LAKETOWN BUTCHERY</div>
    <div class="center">${esc(branch)}</div>
    <hr class="rule" />
    <div class="row"><span>Date</span><span>${esc(datePart)}</span></div>
    <div class="row"><span>Time</span><span>${esc(timePart)}</span></div>
    <div class="row"><span>Served by</span><span>${esc(servedBy)}</span></div>
    ${table ? `<div class="row"><span>Table</span><span>${esc(table)}</span></div>` : ""}
    <div class="row"><span>Ticket</span><span>${esc(sale?.saleNumber || "")}</span></div>
    <hr class="rule" />
    ${itemHtml}
    ${orderNotes ? `<div class="item">${esc(orderNotes)}</div>` : ""}
    <hr class="rule" />
    <div class="row"><span>Total</span><span>${esc(formatMoney(sale?.totalAmount))}</span></div>
  </div>` : `<div id="slip" class="slip">
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
    <div class="row"><span>Till</span><span>6967914</span></div>
    <hr class="rule" />
    <div class="thanks">THANK YOU &amp; WELCOME AGAIN.</div>
    <div class="credit">Built by mangoseasonlabs.co.ke</div>
  </div>`}
  <script>
    window.onload = function () {
      function mm(el) {
        var contentMm = Math.ceil(el.offsetHeight * 25.4 / 96) + 2;
        // Wider than tall makes Chrome pick landscape and the slip prints sideways.
        return Math.max(contentMm, 74);
      }
      var slip = document.getElementById("slip");
      var style = document.createElement("style");
      style.textContent = "@page { size: 72mm " + mm(slip) + "mm; margin: 0; }";
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
