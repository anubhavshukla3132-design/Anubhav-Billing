const { chromium } = require("playwright");
const { generateMedicalBillHTML } = require("../templates/medical-bill.template");

async function generatePDF(req, res) {
  let browser;

  try {
    const data = req.body;
    const html = generateMedicalBillHTML(data);

    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=bill-${Date.now()}.pdf`,
    );

    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({
      error: "PDF generation failed",
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { generatePDF };
