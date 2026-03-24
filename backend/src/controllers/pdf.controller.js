const { chromium } = require("playwright");
const QRCode = require("qrcode");
const mongoose = require("mongoose");
const Bill = require("../models/Bill");
const Patient = require("../models/Patient");
const Medicine = require("../models/Medicine");
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
        const pName = data.patientName ? data.patientName.trim() : "";
        const pMobile = data.patientMobile ? data.patientMobile.trim() : "";
        const pAddress = data.patientAddress ? data.patientAddress.trim() : "";

        if (pMobile) {
           patient = await Patient.findOne({ phone: pMobile });
        }
        if (!patient) {
          patient = await Patient.create({
            name: pName,
            phone: pMobile,
            address: pAddress
          });
        } else {
          let updated = false;
          if (pName && patient.name !== pName) {
            patient.name = pName;
            updated = true;
          }
          if (pAddress && patient.address !== pAddress) {
            patient.address = pAddress;
            updated = true;
          }
          if (updated) {
            await patient.save();
          }
        }

        const invoiceNumber = data.billNo || `INV-${Date.now()}`;
        
        // --- Smart Stock Deduction (handles Edits & New Bills) ---
        const existingBill = await Bill.findOne({ invoiceNumber });
        const newItems = (data.items || []).filter(i => i.productName && i.productName.trim() !== "");
        
        const oldStockMap = {};
        if (existingBill && existingBill.items) {
          existingBill.items.forEach(item => {
             oldStockMap[item.name] = (oldStockMap[item.name] || 0) + item.quantity;
          });
        }
        
        const newStockMap = {};
        newItems.forEach(item => {
             newStockMap[item.productName] = (newStockMap[item.productName] || 0) + (Number(item.quantity) || 1);
        });
        
        const allMedicineNames = new Set([...Object.keys(oldStockMap), ...Object.keys(newStockMap)]);
        
        // --- Validate stock won't go negative ---
        const insufficientStock = [];
        for (const medName of allMedicineNames) {
           const oldQ = oldStockMap[medName] || 0;
           const newQ = newStockMap[medName] || 0;
           const diff = newQ - oldQ;
           if (diff > 0) {
              const med = await Medicine.findOne({ name: new RegExp(`^${medName}$`, 'i') });
              if (med && typeof med.stock === 'number') {
                 if (med.stock < diff) {
                    insufficientStock.push({ name: medName, available: med.stock, requested: newQ });
                 }
              }
           }
        }
        if (insufficientStock.length > 0) {
           return res.status(400).json({
              error: `Stock insufficient for: ${insufficientStock.map(i => `${i.name} (Available: ${i.available}, Requested: ${i.requested})`).join(', ')}`
           });
        }
        // --- End validation ---
        
        for (const medName of allMedicineNames) {
           const oldQ = oldStockMap[medName] || 0;
           const newQ = newStockMap[medName] || 0;
           const diff = newQ - oldQ; 
           if (diff !== 0) {
              await Medicine.updateOne(
                 { name: new RegExp(`^${medName}$`, 'i') },
                 { $inc: { stock: -diff } }
              );
           }
        }
        // --------------------------------------------------------

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