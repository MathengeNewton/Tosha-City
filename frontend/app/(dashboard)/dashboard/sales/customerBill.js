import { paymentLabel } from "./PaymentPicker";
import { formatKes, isSmallCook, roundUpKes } from "./saleLines";

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
    month: "short",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
  return { datePart, timePart };
}

function formatQty(value) {
  const qty = Number(value);
  if (!Number.isFinite(qty)) return "0";
  return qty.toLocaleString("en-KE", { maximumFractionDigits: 3 });
}

/** Till amounts (rounded up to whole shillings as everywhere else), shown POS-style with two decimals. */
function money(value) {
  return roundUpKes(value).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

const DIVIDER_ROW = `<tr><td class="divider" colspan="4"><hr class="rule" /></td></tr>`;

function lineTotalOf(item) {
  return item.totalPrice ?? Number(item.quantity) * Number(item.unitPrice || 0);
}

function kitchenSlipBody(sale, items, table, timePart) {
  const orderNotes = sale?.restaurantOrder?.notes;
  const lines = items
    .map((item) => {
      const qty = formatQty(soldQuantity(item));
      const unit = item.product?.unit || "";
      const name = item.product?.name || "Item";
      return `
        <div class="k-line">
          <div>${item.cookInKitchen ? "COOK · " : ""}${esc(name)}</div>
          <div class="row"><span>${esc(qty)} ${esc(unit)}</span><span>KES ${esc(formatKes(lineTotalOf(item)))}</span></div>
        </div>`;
    })
    .join("");
  return `
    <div class="center k-title">KITCHEN</div>
    ${table ? `<div class="table-big">TABLE ${esc(table)}</div>` : ""}
    <div class="row"><span>${esc(timePart)}</span><span>${esc(sale?.saleNumber || "")}</span></div>
    <hr class="rule" />
    ${lines}
    ${orderNotes ? `<hr class="rule" /><div class="k-line"><b>NOTES:</b> ${esc(orderNotes)}</div>` : ""}`;
}

function customerBillBody(sale, items, table, when, settings) {
  const { datePart, timePart } = when;
  const branch = sale?.branch?.name || "LakeTown Butchery";
  const servedBy = sale?.soldBy?.username || sale?.soldBy?.email || "Cashier";
  const location = settings?.receiptLocation;
  const phone = settings?.receiptPhone;
  const channel = sale?.payment?.mpesaChannel || sale?.mpesaChannel;
  const till = channel === "PAYBILL" ? null : settings?.tillNumber;
  const paybill = channel === "TILL" ? null : settings?.paybillNumber;
  const paybillAccount = settings?.paybillAccount;
  const payment = sale?.payment;
  const customer = sale?.customer;

  const itemRows = items
    .map((item) => {
      const qty = formatQty(soldQuantity(item));
      const unit = item.product?.unit || "";
      const name = item.product?.name || "Item";
      const row = `<tr><td class="desc">${esc(name)}</td><td>${esc(qty)} ${esc(unit)}</td><td>${esc(money(item.unitPrice))}</td><td>${esc(money(lineTotalOf(item)))}</td></tr>`;
      if (!item.cookInKitchen || !(Number(item.cookingFee) > 0)) return row;
      const small = isSmallCook(soldQuantity(item));
      const cookRow = `<tr class="sub"><td class="desc">+ COOKING${small ? " (UNDER ½ KG)" : ""}</td><td>${esc(qty)} KG</td><td>${small ? "FLAT" : esc(money(item.cookingFeePerKg))}</td><td>${esc(money(item.cookingFee))}</td></tr>`;
      return row + cookRow;
    })
    .join("");

  const paidLabel = payment
    ? paymentLabel(payment.method, payment.mpesaChannel)
    : `${paymentLabel(sale?.paymentMethod, sale?.mpesaChannel)} (UNPAID)`;
  const paidAmount = payment ? payment.amount : sale?.totalAmount;
  return `
    <div class="head">
      <div class="store">LAKETOWN BUTCHERY</div>
      <div>${esc(branch)}</div>
      ${location ? `<div>${esc(location)}</div>` : ""}
      ${phone ? `<div>TELEPHONE NO: ${esc(phone)}</div>` : ""}
      <div class="doc-title">CUSTOMER BILL</div>
    </div>
    <div class="meta">
      <div>RECEIPT No: ${esc(sale?.saleNumber || "")}</div>
      <div>DATETIME: ${esc(datePart)} &nbsp;${esc(timePart)}</div>
      <div>STORE: ${esc(branch)}${table ? ` &nbsp; TABLE: ${esc(table)}` : ""}</div>
      <div>CASHIER: ${esc(servedBy)}</div>
    </div>
    <hr class="rule" />
    <table class="items">
      <colgroup><col /><col class="c-qty" /><col class="c-price" /><col class="c-amt" /></colgroup>
      <thead><tr><th class="desc">ITEM</th><th>QTY</th><th>PRICE</th><th>AMOUNT</th></tr></thead>
      <tbody>${DIVIDER_ROW}${itemRows}</tbody>
    </table>
    <hr class="rule" />
    <div class="row"><span>TOTAL LINES: &nbsp;${items.length}</span><span></span></div>
    <hr class="rule" />
    <div class="row total"><span>TOTAL</span><span>${esc(money(sale?.totalAmount))}</span></div>
    <hr class="rule" />
    <div class="row"><span>${esc(paidLabel)}</span><span>${esc(money(paidAmount))}</span></div>
    ${payment?.reference ? `<div class="row"><span>REF</span><span>${esc(payment.reference)}</span></div>` : ""}
    <hr class="rule" />
    ${till || paybill ? `
    <div class="center">PAY VIA M-PESA</div>
    ${till ? `<div class="row"><span>BUY GOODS TILL</span><span>${esc(till)}</span></div>` : ""}
    ${paybill ? `<div class="row"><span>PAYBILL</span><span>${esc(paybill)}</span></div>` : ""}
    ${paybill && paybillAccount ? `<div class="row"><span>ACCOUNT NO.</span><span>${esc(paybillAccount)}</span></div>` : ""}
    <hr class="rule" />` : ""}
    <div class="small">YOU WERE SERVED BY: ${esc(servedBy)}</div>
    <hr class="rule" />
    ${customer ? `
    <div class="center">CUSTOMER DETAILS</div>
    <div class="row"><span>NAME</span><span>${esc(customer.name)}</span></div>
    ${customer.phone ? `<div class="row"><span>PHONE</span><span>${esc(customer.phone)}</span></div>` : ""}
    <hr class="rule" />` : ""}
    <div class="center">THANK YOU &amp; WELCOME AGAIN</div>
    <div class="credit">Powered by mangoseasonlabs.co.ke</div>`;
}

export function buildCustomerBillDocument(sale, kind = "customer", settings = {}) {
  const when = billWhen(sale?.soldAt);
  const table = sale?.tableLabel || sale?.restaurantOrder?.tableLabel;
  const items = Array.isArray(sale?.items) ? sale.items : [];
  const body =
    kind === "kitchen"
      ? kitchenSlipBody(sale, items, table, when.timePart)
      : customerBillBody(sale, items, table, when, settings);

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
      font-size: 7px;
      font-weight: 400;
      line-height: 1.3;
      text-transform: uppercase;
    }
    .center { text-align: center; }
    .head { text-align: center; font-size: 6px; }
    .store { font-size: 7px; font-weight: 700; }
    .doc-title { margin-top: 4px; }
    .meta { margin-top: 3px; font-size: 6px; }
    .rule { border: 0; border-top: 1px dashed #000; margin: 3px 0; }
    .row { display: flex; justify-content: space-between; gap: 6px; }
    .row span:last-child { text-align: right; white-space: nowrap; }
    .total { font-size: 8px; font-weight: 700; }
    .small { font-size: 6px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 6.5px; }
    th { font-weight: 400; text-align: right; padding: 0; }
    td.divider { padding: 0; }
    td { text-align: right; vertical-align: top; padding: 1px 0; white-space: nowrap; }
    th.desc, td.desc { text-align: left; white-space: normal; overflow-wrap: anywhere; padding-right: 2mm; }
    col.c-qty { width: 15mm; }
    col.c-price { width: 13mm; }
    col.c-amt { width: 15mm; }
    tr.sub td.desc { padding-left: 2mm; }
    .credit { text-align: center; margin-top: 2px; font-size: 5px; text-transform: none; }
    .k-title { font-size: 12px; font-weight: 700; }
    .k-line { font-size: 12px; margin-bottom: 4px; }
    .table-big { text-align: center; font-size: 14px; font-weight: 700; margin: 2px 0; }
    @media print {
      html, body { width: 80mm; margin: 0; padding: 0; }
      .slip { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div id="slip" class="slip">${body}
  </div>
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
