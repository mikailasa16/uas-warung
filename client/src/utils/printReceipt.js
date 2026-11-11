// Cetak struk: web -> dialog print browser (bisa "Save as PDF"); native -> expo-print / bagikan PDF.
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { STORE_NAME } from '../theme';
import { formatDateTime, rupiah } from './format';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function buildReceiptHtml(trx) {
  const rows = trx.details
    .map(
      (d) => `<tr><td colspan="2">${esc(d.product?.productName)}</td></tr>
      <tr><td>${d.quantity} x ${rupiah(d.unitPrice)}</td><td style="text-align:right">${rupiah(d.subtotal)}</td></tr>`,
    )
    .join('');
  return `<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <style>body{font-family:monospace;font-size:13px;max-width:320px;margin:0 auto;padding:12px}
  table{width:100%;border-collapse:collapse}td{padding:2px 0}hr{border:0;border-top:1px dashed #000}
  h2,p{text-align:center;margin:4px 0}</style></head><body>
  <h2>${esc(STORE_NAME)}</h2><p>Struk Pembelian</p><hr>
  <p style="text-align:left">No: ${esc(trx.transactionNumber)}<br>Tgl: ${formatDateTime(trx.createdAt)}<br>Kasir: ${esc(trx.user?.name)}</p><hr>
  <table>${rows}</table><hr>
  <table>
   <tr><td>Total</td><td style="text-align:right"><b>${rupiah(trx.totalAmount)}</b></td></tr>
   <tr><td>Tunai</td><td style="text-align:right">${rupiah(trx.paymentAmount)}</td></tr>
   <tr><td>Kembalian</td><td style="text-align:right">${rupiah(trx.changeAmount)}</td></tr>
  </table><hr><p>Terima kasih sudah berbelanja!</p></body></html>`;
}

export async function printReceipt(trx) {
  const html = buildReceiptHtml(trx);
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank', 'width=420,height=640');
    if (!w) throw new Error('Pop-up diblokir browser. Izinkan pop-up untuk mencetak struk.');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
    return;
  }
  await Print.printAsync({ html });
}

export async function sharePdf(trx) {
  const { uri } = await Print.printToFileAsync({ html: buildReceiptHtml(trx) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Simpan / bagikan struk' });
  }
}
