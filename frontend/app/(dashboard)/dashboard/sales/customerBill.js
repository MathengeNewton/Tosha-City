import { formatKes, isSmallCook } from "./saleLines";

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

const formatMoney = formatKes;

// Weight lines are priced by amount and the stored quantity only keeps 2 decimals,
// so 500 KES at 680/kg is saved as 0.74 kg; derive the weight that was actually sold.
function soldQuantity(item) {
  const unitPrice = Number(item.unitPrice);
  const total = Number(item.totalPrice);
  if ((item.product?.saleMode || "WEIGHT") === "WEIGHT" && unitPrice > 0 && total > 0) {
    return total / unitPrice;
  }
  return Number(item.quantity);
}

export function buildCustomerBillDocument(sale, kind = "customer", settings = {}) {
  const { datePart, timePart } = billWhen(sale?.soldAt);
  const branch = sale?.branch?.name || "LakeTown Butchery";
  const servedBy = sale?.soldBy?.username || sale?.soldBy?.email || "Cashier";
  const customer = sale?.customer?.name || "Walk-in";
  const table = sale?.tableLabel || sale?.restaurantOrder?.tableLabel;
  const items = Array.isArray(sale?.items) ? sale.items : [];
  const location = settings?.receiptLocation;
  const phone = settings?.receiptPhone;
  const channel = sale?.payment?.mpesaChannel || sale?.mpesaChannel;
  const till = channel === "PAYBILL" ? null : settings?.tillNumber;
  const paybill = channel === "TILL" ? null : settings?.paybillNumber;
  const paybillAccount = settings?.paybillAccount;

  const orderNotes = sale?.restaurantOrder?.notes;
  const itemHtml = items
    .map((item) => {
      const qty = formatQty(soldQuantity(item));
      const unit = item.product?.unit || "";
      const name = item.product?.name || "Item";
      const cooked = !!item.cookInKitchen;
      const unitPrice = formatMoney(item.unitPrice);
      const lineTotal = formatMoney(item.totalPrice ?? Number(item.quantity) * Number(item.unitPrice || 0));
      if (kind === "kitchen") {
        return `
        <div class="k-line">
          <div>${cooked ? "COOK · " : ""}${esc(name)}</div>
          <div class="row"><span>${esc(qty)} ${esc(unit)}</span><span>KES ${esc(lineTotal)}</span></div>
        </div>`;
      }
      const cookRate = isSmallCook(soldQuantity(item))
        ? "under ½ kg"
        : `@${esc(formatMoney(item.cookingFeePerKg))}`;
      const cookingLine =
        cooked && Number(item.cookingFee) > 0
          ? `<span class="name cook">+ Cooking</span><span>${esc(qty)} kg</span><span>${cookRate}</span><span class="amt">${esc(formatMoney(item.cookingFee))}</span>`
          : "";
      return `<span class="name">${esc(name)}</span><span>${esc(qty)} ${esc(unit)}</span><span>@${esc(unitPrice)}</span><span class="amt">${esc(lineTotal)}</span>${cookingLine}`;
    })
    .join("");
  const itemsBlock = kind === "kitchen" ? itemHtml : `<div class="items">${itemHtml}</div>`;

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
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; color: #000; }
    html, body {
      width: 80mm;
      height: auto;
      min-height: 0;
      margin: 0;
      padding: 0;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .slip {
      width: 80mm;
      margin: 0;
      padding: 2mm 4mm 3mm;
      background: #fff;
      font-family: Arial, "Liberation Sans", Helvetica, sans-serif;
      font-size: 8px;
      font-weight: 400;
      line-height: 1.3;
      text-transform: uppercase;
    }
    .center { text-align: center; }
    .title { font-size: 9px; font-weight: 700; }
    .house { font-size: 8px; font-weight: 700; }
    .head-line { font-size: 7px; }
    .rule { border: 0; border-top: 1px dashed #000; margin: 3px 0; }
    .row { display: flex; justify-content: space-between; gap: 6px; }
    .row span:last-child { text-align: right; white-space: nowrap; }
    .details { font-size: 7px; }
    .items {
      display: grid;
      grid-template-columns: 1fr auto auto auto;
      column-gap: 6px;
      row-gap: 1px;
      font-size: 7.5px;
    }
    .items span { white-space: nowrap; text-align: right; }
    .items .name { white-space: normal; text-align: left; overflow-wrap: anywhere; }
    .items .cook { padding-left: 6px; }
    .total { font-size: 9px; font-weight: 700; }
    .pay { font-size: 7px; }
    .table-big { text-align: center; font-size: 12px; font-weight: 700; margin: 2px 0; }
    .credit { text-align: center; margin-top: 2px; font-size: 6px; text-transform: none; }
    .k-title { font-size: 12px; font-weight: 700; }
    .k-line { font-size: 12px; margin-bottom: 4px; }
    @media print {
      html, body { width: 80mm; margin: 0; padding: 0; }
      .slip { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${kind === "kitchen" ? `<div id="slip" class="slip">
    <div class="center k-title">KITCHEN</div>
    ${table ? `<div class="table-big">TABLE ${esc(table)}</div>` : ""}
    <div class="row"><span>${esc(timePart)}</span><span>${esc(sale?.saleNumber || "")}</span></div>
    <hr class="rule" />
    ${itemsBlock}
    ${orderNotes ? `<hr class="rule" /><div class="k-line"><b>Notes:</b> ${esc(orderNotes)}</div>` : ""}
  </div>` : `<div id="slip" class="slip">
    <div class="center title">CUSTOMER BILL</div>
    <div class="center house">LAKETOWN BUTCHERY</div>
    <div class="center head-line">${esc(branch)}</div>
    ${location ? `<div class="center head-line">${esc(location)}</div>` : ""}
    ${phone ? `<div class="center head-line">Tel: ${esc(phone)}</div>` : ""}
    ${table ? `<div class="table-big">TABLE ${esc(table)}</div>` : ""}
    <hr class="rule" />
    <div class="details">
      <div class="row"><span>Date</span><span>${esc(datePart)}</span></div>
      <div class="row"><span>Time</span><span>${esc(timePart)}</span></div>
      <div class="row"><span>Served by</span><span>${esc(servedBy)}</span></div>
      <div class="row"><span>Customer</span><span>${esc(customer)}</span></div>
      <div class="row"><span>Ticket</span><span>${esc(sale?.saleNumber || "")}</span></div>
    </div>
    <hr class="rule" />
    ${itemsBlock}
    <hr class="rule" />
    <div class="row total"><span>Total</span><span>${esc(formatMoney(sale?.totalAmount))}</span></div>
    ${till || paybill ? `<hr class="rule" />
    <div class="pay">
      <div class="center">PAY VIA M-PESA</div>
      ${till ? `<div class="row"><span>Buy Goods Till</span><span>${esc(till)}</span></div>` : ""}
      ${paybill ? `<div class="row"><span>Paybill</span><span>${esc(paybill)}</span></div>` : ""}
      ${paybill && paybillAccount ? `<div class="row"><span>Account No.</span><span>${esc(paybillAccount)}</span></div>` : ""}
    </div>` : ""}
    <hr class="rule" />
    <div class="center">THANK YOU &amp; WELCOME AGAIN.</div>
    <div class="credit">Powered by mangoseasonlabs.co.ke</div>
  </div>`}
  <script>
    window.onload = function () {
      function mm(el) {
        var contentMm = Math.ceil(el.offsetHeight * 25.4 / 96) + 2;
        // Wider than tall makes Chrome pick landscape and the slip prints sideways.
        return Math.max(contentMm, 82);
      }
      var slip = document.getElementById("slip");
      var style = document.createElement("style");
      style.textContent = "@page { size: 80mm " + mm(slip) + "mm; margin: 0; }";
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
