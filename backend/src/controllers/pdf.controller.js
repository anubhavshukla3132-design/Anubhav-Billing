const { chromium } = require("playwright");
const QRCode = require("qrcode");
const mongoose = require("mongoose");
const Bill = require("../models/Bill");
const Patient = require("../models/Patient");
const { generateMedicalBillHTML } = require("../templates/medical-bill.template");

async function generatePDF(req, res) {
  let browser;

  try {
    const data = req.body;

    // 1. Generate UPI QR Code (if an amount is provided/calculated)
    // The frontend should ideally send `grandTotal` and we use that for the QR.
    let upiQrCodeUrl = "";
    const upiId = process.env.UPI_ID || "7398188195@paytm"; // Default fallback
    const storeName = data.storeName || "KRISHNA MEDICAL STORE";
    const amount = data.grandTotal ? Number(data.grandTotal).toFixed(2) : "0.00"; 
    
    // Only generate QR if amount > 0 or if we want to default it without amount
    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${amount}&cu=INR`;
    try {
      upiQrCodeUrl = await QRCode.toDataURL(upiString);
      data.upiQrCodeUrl = upiQrCodeUrl;
    } catch (err) {
      console.error("QR Code generation failed:", err);
    }

    // 2. Save Bill to MongoDB (if connected)
    if (mongoose.connection.readyState === 1 && data.patientName) {
      try {
        let patient = false;
        if (data.patientMobile) {
           patient = await Patient.findOne({ phone: data.patientMobile });
        }
        if (!patient) {
          patient = await Patient.create({
            name: data.patientName,
            phone: data.patientMobile || "",
            address: data.patientAddress || ""
          });
        }

        const invoiceNumber = data.billNo || `INV-${Date.now()}`;
        await Bill.findOneAndUpdate(
          { invoiceNumber },
          {
            invoiceNumber,
            patient: patient._id,
            billDate: data.billDate || "",
            doctorName: data.doctorName || "",
            prescription: data.prescription || "",
            items: (data.items || []).filter(i => i.productName && i.productName.trim() !== "").map(i => ({
              name: i.productName,
              packing: i.packing || "",
              batchNo: i.batchNo || "",
              exp: i.exp || "",
              quantity: Number(i.quantity) || 1,
              mrp: Number(i.mrp) || 0,
              discount: Number(i.discount) || 0,
              price: Number(i.mrp) || 0,
              total: Number(i.amount) || 0
            })),
            subtotal: Number(amount) || 0,
            finalTotal: Number(amount) || 0,
            upiQrCodeUrl,
            createdBy: req.session?.user?.username || "Admin"
          },
          { upsert: true, new: true }
        );
      } catch (dbErr) {
        console.error("Failed to save bill to DB:", dbErr.message);
      }
    }

    // Generate HTML
    const html = generateMedicalBillHTML(data);

    // Launch Chromium (Render compatible)
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process"
      ]
    });

    const page = await browser.newPage();

    // Set HTML content
    await page.setContent(html, {
      waitUntil: "networkidle",
      timeout: 60000
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "10mm",
        bottom: "10mm",
        left: "10mm",
        right: "10mm"
      }
    });

    // Send PDF response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=medical-bill-${Date.now()}.pdf`
    );

    return res.send(pdfBuffer);

  } catch (error) {
    console.error("PDF generation error:", error);
    return res.status(500).json({
      error: "PDF generation failed",
      message: error.message
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function getNextBillNumber(req, res) {
  try {
    const lastBill = await Bill.findOne().sort({ createdAt: -1 });
    let nextNum = 1;
    if (lastBill && lastBill.invoiceNumber) {
      const match = lastBill.invoiceNumber.match(/\d+$/);
      if (match) {
        nextNum = parseInt(match[0], 10) + 1;
      }
    }
    const nextInvoice = `KMS${String(nextNum).padStart(5, '0')}`;
    res.json({ nextBillNo: nextInvoice });
  } catch (error) {
    res.json({ nextBillNo: `KMS${Date.now().toString().slice(-5)}` });
  }
}

module.exports = { generatePDF, getNextBillNumber };