// Cetak nota pembelian ke supplier: web -> dialog print browser, native -> expo-print / bagikan PDF.
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { STORE_NAME } from '../theme';
import { formatDateTime, rupiah } from './format';
import { purchaseStatusLabel } from './purchaseStatus';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function buildPurchaseNoteHtml(purchase) {
  const rows = purchase.items
    .map(
      (d) => `<tr><td colspan="2">${esc(d.productName)}${d.isNewProduct ? ' <i>(barang baru)</i>' : ''}</td></tr>
      <tr><td>${d.quantity} x ${rupiah(d.unitCost)}</td><td style="text-align:right">${rupiah(d.subtotal)}</td></tr>`,
    )
    .join('');

  return `<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <style>body{font-family:monospace;font-size:13px;max-width:320px;margin:0 auto;padding:12px}
  table{width:100%;border-collapse:collapse}td{padding:2px 0}hr{border:0;border-top:1px dashed #000}
  h2,p{text-align:center;margin:4px 0}</style></head><body>
  <h2>${esc(STORE_NAME)}</h2><p>Nota Pembelian</p><hr>
  <p style="text-align:left">Nomor: ${esc(purchase.purchaseNumber)}<br>Tanggal: ${formatDateTime(purchase.createdAt)}
  <br>Supplier: ${esc(purchase.supplier?.name || 'Tanpa supplier')}<br>Status: ${esc(purchaseStatusLabel(purchase.status))}
  ${purchase.receivedAt ? `<br>Diterima: ${formatDateTime(purchase.receivedAt)}` : ''}</p><hr>
  <table>${rows}</table><hr>
  <table><tr><td>Total Pembelian</td><td style="text-align:right"><b>${rupiah(purchase.totalAmount)}</b></td></tr></table>
  ${purchase.note ? `<hr><p style="text-align:left">Catatan: ${esc(purchase.note)}</p>` : ''}
  <hr><p>Nota pembelian dari ${esc(STORE_NAME)}.</p></body></html>`;
}

export async function printPurchaseNote(purchase) {
  const html = buildPurchaseNoteHtml(purchase);
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank', 'width=420,height=640');
    if (!w) throw new Error('Pop-up diblokir browser. Izinkan pop-up untuk mencetak nota.');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
    return;
  }
  await Print.printAsync({ html });
}

export async function sharePurchasePdf(purchase) {
  const { uri } = await Print.printToFileAsync({ html: buildPurchaseNoteHtml(purchase) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Simpan / bagikan nota pembelian' });
  }
}
