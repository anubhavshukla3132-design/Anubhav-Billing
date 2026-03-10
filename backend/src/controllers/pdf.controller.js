const { chromium } = require("playwright");
const { generateMedicalBillHTML } = require("../templates/medical-bill.template");

async function generatePDF(req, res) {
  let browser;

  try {
    const data = req.body;

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

module.exports = { generatePDF };