"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Order } from "@/components/dataType";

type SellerDetails = {
  companyName: string;
  gstin: string;
  panNumber: string;
  shippingFromAddress: string;
  warehouse: { name: string; address: string } | null;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function money(value: number) {
  return `Rs. ${value.toFixed(2)}`;
}

export default function DownloadInvoiceButton({
  order,
  onError,
}: {
  order: Order;
  onError: (message: string) => void;
}) {
  const [downloading, setDownloading] = useState(false);

  async function downloadInvoice() {
    setDownloading(true);
    onError("");

    try {
      const response = await fetch(`/api/orders/${order._id}/invoice`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to prepare invoice.");
      }

      const invoiceOrder: Order = data.order;
      const seller: SellerDetails = data.seller;
      const subtotal = Number(invoiceOrder.subtotal || 0);
      const discountOnItems = Math.min(Number(invoiceOrder.discount || 0), subtotal);
      const rows = invoiceOrder.items.map((item, index) => {
        const gross = Number(item.total ?? item.price * item.quantity);
        const discount =
          subtotal <= 0
            ? 0
            : index === invoiceOrder.items.length - 1
              ? roundMoney(
                  discountOnItems -
                    invoiceOrder.items.slice(0, -1).reduce(
                      (sum, previous) =>
                        sum +
                        roundMoney(
                          (discountOnItems *
                            Number(previous.total ?? previous.price * previous.quantity)) /
                            subtotal
                        ),
                      0
                    )
                )
              : roundMoney((discountOnItems * gross) / subtotal);
        const cgstRate = Number(item.cgstRate || 0);
        const sgstRate = Number(item.sgstRate || 0);
        const taxableAmount = roundMoney(
          Math.max(0, gross - discount) /
            (1 + (cgstRate + sgstRate) / 100)
        );
        const cgst = roundMoney((taxableAmount * cgstRate) / 100);
        const sgst = roundMoney((taxableAmount * sgstRate) / 100);

        return {
          name: `${item.name}${item.sku ? `\nSKU: ${item.sku}` : ""}`,
          quantity: item.quantity,
          gross,
          discount,
          taxableAmount,
          cgstRate,
          sgstRate,
          cgst,
          sgst,
          total: roundMoney(taxableAmount + cgst + sgst),
        };
      });

      const totals = rows.reduce(
        (sum, row) => ({
          gross: sum.gross + row.gross,
          discount: sum.discount + row.discount,
          taxable: sum.taxable + row.taxableAmount,
          cgst: sum.cgst + row.cgst,
          sgst: sum.sgst + row.sgst,
          total: sum.total + row.total,
        }),
        { gross: 0, discount: 0, taxable: 0, cgst: 0, sgst: 0, total: 0 }
      );
      const shippingDiscount = Math.max(
        0,
        Number(invoiceOrder.discount || 0) - discountOnItems
      );
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;

      const addressBlock = (
        heading: string,
        lines: string[],
        x: number,
        y: number,
        width: number
      ) => {
        const height = 38;
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, width, height, 2, 2, "FD");
        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(heading.toUpperCase(), x + 4, y + 6);
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "normal");
        const wrapped = lines
          .filter(Boolean)
          .flatMap((line) => doc.splitTextToSize(line, width - 8));
        doc.text(wrapped.slice(0, 6), x + 4, y + 12);
      };

      const companyName = seller.companyName || "Company name not configured";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(doc.splitTextToSize(companyName, 96).slice(0, 2), margin, 18);
      doc.setTextColor(30, 64, 175);
      doc.setFontSize(14);
      doc.text("TAX INVOICE", pageWidth - margin, 18, { align: "right" });
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        [
          `GSTIN: ${seller.gstin || "Not configured"}`,
          ...(seller.panNumber ? [`PAN: ${seller.panNumber}`] : []),
        ],
        margin,
        29
      );
      doc.text(`Order ID: ${invoiceOrder.orderNumber}`, pageWidth - margin, 25, {
        align: "right",
      });
      doc.text(
        `Invoice date: ${new Intl.DateTimeFormat("en-IN", {
          dateStyle: "medium",
        }).format(new Date(invoiceOrder.placedAt))}`,
        pageWidth - margin,
        30,
        { align: "right" }
      );
      doc.text(`Channel: ${invoiceOrder.channel}`, pageWidth - margin, 35, {
        align: "right",
      });

      const addressY = 44;
      const gap = 4;
      const width = (contentWidth - gap * 2) / 3;
      addressBlock(
        "Shipping From",
        [
          companyName,
          seller.shippingFromAddress || seller.warehouse?.address || "Address not configured",
        ],
        margin,
        addressY,
        width
      );
      addressBlock(
        "Bill To",
        [
          invoiceOrder.customer.name,
          invoiceOrder.customer.billingAddress || invoiceOrder.customer.address || "",
          invoiceOrder.customer.phone || "",
          invoiceOrder.customer.email || "",
        ],
        margin + width + gap,
        addressY,
        width
      );
      addressBlock(
        "Ship To",
        [
          invoiceOrder.customer.name,
          invoiceOrder.customer.shippingAddress || invoiceOrder.customer.address || "",
          invoiceOrder.customer.phone || "",
        ],
        margin + (width + gap) * 2,
        addressY,
        width
      );

      autoTable(doc, {
        startY: 89,
        head: [[
          "Product / SKU", "Qty", "Gross", "Discount", "Taxable", "CGST", "SGST", "Amount",
        ]],
        body: rows.map((row) => [
          row.name,
          String(row.quantity),
          money(row.gross),
          money(row.discount),
          money(row.taxableAmount),
          `${money(row.cgst)}\n(${row.cgstRate}%)`,
          `${money(row.sgst)}\n(${row.sgstRate}%)`,
          money(row.total),
        ]),
        foot: [[
          "TOTAL",
          String(invoiceOrder.items.reduce((sum, item) => sum + item.quantity, 0)),
          money(roundMoney(totals.gross)),
          money(roundMoney(totals.discount)),
          money(roundMoney(totals.taxable)),
          money(roundMoney(totals.cgst)),
          money(roundMoney(totals.sgst)),
          money(roundMoney(totals.total)),
        ]],
        theme: "grid",
        margin: { left: margin, right: margin, bottom: 18 },
        styles: {
          font: "helvetica",
          fontSize: 7,
          cellPadding: 1.8,
          overflow: "linebreak",
          textColor: [30, 41, 59],
          lineColor: [226, 232, 240],
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: 255,
          fontStyle: "bold",
          minCellHeight: 9,
        },
        footStyles: {
          fillColor: [239, 246, 255],
          textColor: [15, 23, 42],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 42, fontStyle: "bold" },
          1: { cellWidth: 9, halign: "right" },
          2: { cellWidth: 21, halign: "right" },
          3: { cellWidth: 19, halign: "right" },
          4: { cellWidth: 23, halign: "right" },
          5: { cellWidth: 22, halign: "right" },
          6: { cellWidth: 22, halign: "right" },
          7: { cellWidth: 24, halign: "right", fontStyle: "bold" },
        },
      });

      const finalY =
        (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
        82;
      autoTable(doc, {
        startY: finalY + 5,
        margin: { left: pageWidth - margin - 82, right: margin, bottom: 18 },
        body: [
          ["Item gross total", money(roundMoney(totals.gross))],
          ["Item discount", `- ${money(roundMoney(totals.discount))}`],
          ["Taxable amount", money(roundMoney(totals.taxable))],
          ["CGST", money(roundMoney(totals.cgst))],
          ["SGST", money(roundMoney(totals.sgst))],
          ["Shipping", money(Number(invoiceOrder.shipping || 0))],
          ...(shippingDiscount > 0
            ? [["Shipping discount", `- ${money(shippingDiscount)}`]]
            : []),
          ["Grand Total", money(Number(invoiceOrder.totalAmount || 0))],
        ],
        theme: "plain",
        styles: { font: "helvetica", fontSize: 8, cellPadding: 1.7 },
        columnStyles: {
          0: { cellWidth: 48, textColor: [71, 85, 105] },
          1: { cellWidth: 34, halign: "right", textColor: [15, 23, 42] },
        },
        didParseCell: (hook) => {
          if (hook.row.index === hook.table.body.length - 1) {
            hook.cell.styles.fontStyle = "bold";
            hook.cell.styles.textColor = [30, 64, 175];
            hook.cell.styles.lineWidth = { top: 0.5 };
          }
        },
      });

      const footerY = Math.min(
        pageHeight - 17,
        ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
          finalY) + 8
      );
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        "Product prices are GST-inclusive. Taxable values are calculated by reverse-calculating the applicable CGST and SGST.",
        margin,
        footerY
      );

      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Order ${invoiceOrder.orderNumber}  |  Page ${page} of ${pageCount}`,
          pageWidth - margin,
          pageHeight - 7,
          { align: "right" }
        );
      }

      doc.save(
        `invoice-${invoiceOrder.orderNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to download invoice.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      onClick={() => void downloadInvoice()}
      disabled={downloading}
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
    >
      <Download size={14} />
      {downloading ? "Preparing Invoice..." : "Download Invoice"}
    </button>
  );
}
