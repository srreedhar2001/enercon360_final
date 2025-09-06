const fs = require('fs').promises;
const path = require('path');
const puppeteer = require('puppeteer');

class InvoiceService {
    constructor() {
        this.invoicesDir = path.join(__dirname, '../../invoices');
    // Prepare a promise we can await before writing files to avoid race conditions
    this._dirReady = this.ensureInvoicesDirectory();
    }

    async ensureInvoicesDirectory() {
        try {
            await fs.access(this.invoicesDir);
        } catch (error) {
            await fs.mkdir(this.invoicesDir, { recursive: true });
        }
    }

    generateInvoiceHTML(orderData) {
        const { order, orderDetails, counter } = orderData;
        
        const invoiceHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice #INV-${order.id}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            line-height: 1.6;
            color: #333;
        }
        
        .invoice-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
        }
        
        .company-info {
            flex: 1;
        }
        
        .company-logo {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 15px;
        }
        
        .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
        }
        
        .company-tagline {
            color: #6b7280;
            margin-bottom: 10px;
        }
        
        .company-address {
            color: #6b7280;
            font-size: 11px;
        }
        
        .invoice-details {
            text-align: right;
        }
        
        .invoice-title {
            font-size: 32px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        
        .invoice-meta {
            color: #6b7280;
            font-size: 11px;
        }
        
        .bill-to-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        
        .bill-to, .invoice-info {
            flex: 1;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            margin: 0 10px;
        }
        
        .bill-to {
            margin-left: 0;
        }
        
        .invoice-info {
            margin-right: 0;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
        }
        
        .section-title::before {
            content: "📍";
            margin-right: 8px;
        }
        
        .invoice-info .section-title::before {
            content: "📅";
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .items-table thead {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
        }
        
        .items-table th {
            padding: 15px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .items-table th.text-center {
            text-align: center;
        }
        
        .items-table th.text-right {
            text-align: right;
        }
        
        .items-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .items-table tbody tr:hover {
            background: #f9fafb;
        }
        
        .items-table tbody tr:last-child td {
            border-bottom: none;
        }
        
        .text-center {
            text-align: center;
        }
        
        .text-right {
            text-align: right;
        }
        
        .font-medium {
            font-weight: 500;
        }
        
        .font-bold {
            font-weight: bold;
        }
        
        .text-gray {
            color: #6b7280;
        }
        
        .free-qty-highlight {
            background: linear-gradient(135deg, #ecfdf5, #d1fae5);
            color: #059669;
            font-weight: 600;
            border-radius: 4px;
            padding: 2px 4px;
        }
        
        .gift-icon {
            color: #f59e0b;
            font-size: 14px;
        }
        
        .summary-section {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
        }
        
        .terms {
            flex: 1;
            padding-right: 30px;
        }
        
        .terms h4 {
            font-size: 14px;
            margin-bottom: 10px;
            color: #374151;
        }
        
        .terms ul {
            list-style: none;
            font-size: 11px;
            color: #6b7280;
        }
        
        .terms li {
            margin-bottom: 5px;
            padding-left: 15px;
            position: relative;
        }
        
        .terms li::before {
            content: "•";
            color: #3b82f6;
            position: absolute;
            left: 0;
        }
        
        .summary {
            width: 300px;
            background: #f8fafc;
            border-radius: 8px;
            padding: 20px;
        }
        
        .summary h4 {
            font-size: 16px;
            margin-bottom: 15px;
            color: #374151;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 11px;
        }
        
        .summary-row.total {
            border-top: 2px solid #e5e7eb;
            padding-top: 10px;
            margin-top: 15px;
            font-size: 14px;
            font-weight: bold;
            color: #1e40af;
        }
        
        .amount-words {
            margin-top: 15px;
            padding: 12px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
        }
        
        .amount-words .label {
            font-size: 10px;
            color: #6b7280;
            margin-bottom: 5px;
        }
        
        .amount-words .value {
            font-weight: 500;
            color: #374151;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 10px;
            color: #6b7280;
        }
        
        .footer p {
            margin-bottom: 5px;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            
            .invoice-container {
                box-shadow: none;
                max-width: none;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header Section -->
        <div class="header">
            <div class="company-info">
                <div class="company-logo">E</div>
                <div class="company-name">Enercon 360</div>
                <div class="company-tagline">Pharmaceutical Distribution System</div>
                <div class="company-address">
                    123 Medical Complex, Pharmaceutical District<br>
                    Hyderabad, Telangana - 500001<br>
                    GST: 36ABCDE1234F1Z5 | Phone: +91 40 1234 5678<br>
                    Email: orders@enercon360.com | Web: www.enercon360.com
                </div>
            </div>
            <div class="invoice-details">
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-meta">
                    <strong>Invoice No:</strong> INV-${order.id}<br>
                    <strong>Order No:</strong> SO-${order.id}<br>
                    <strong>Date:</strong> ${new Date(order.orderDate).toLocaleDateString('en-IN')}<br>
                    <strong>Time:</strong> ${new Date(order.createdAt).toLocaleTimeString('en-IN')}
                </div>
            </div>
        </div>

        <!-- Bill To Section -->
        <div class="bill-to-section">
            <div class="bill-to">
                <div class="section-title">Bill To:</div>
                <div class="font-bold">${counter.CounterName}</div>
                <div class="text-gray">
                    ${counter.address || '123 Medical Street'}<br>
                    ${counter.city || 'City'}, ${counter.state || 'State'}<br>
                    Phone: ${counter.phone || '+91 9876543210'}<br>
                    ${counter.gst ? `GST: ${counter.gst}` : ''}
                </div>
            </div>
            <div class="invoice-info">
                <div class="section-title">Order Details:</div>
                <strong>Order Date:</strong> ${new Date(order.orderDate).toLocaleDateString('en-IN')}<br>
                <strong>Payment Terms:</strong> Net 30 Days<br>
                <strong>Payment Status:</strong> ${order.paymentReceived ? 'Paid' : 'Pending'}<br>
                <strong>Total Items:</strong> ${orderDetails.length} items<br>
                <strong>Total Quantity:</strong> ${orderDetails.reduce((sum, item) => sum + (parseInt(item.qty) || 0), 0)} units<br>
                <strong>Free Quantity:</strong> ${orderDetails.reduce((sum, item) => sum + (parseInt(item.freeQty) || 0), 0)} units
                ${orderDetails.reduce((sum, item) => sum + (parseInt(item.freeQty) || 0), 0) > 0 ? ' 🎁' : ''}
            </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Product Description</th>
                    <th class="text-center">Qty</th>
                    <th class="text-center">Free Qty</th>
                    <th class="text-right">Unit Price</th>
                    <th class="text-center">Disc%</th>
                    <th class="text-right">Disc Amt</th>
                    <th class="text-right">CGST</th>
                    <th class="text-right">SGST</th>
                    <th class="text-right">Line Total</th>
                </tr>
            </thead>
            <tbody>
                ${orderDetails.map((item, index) => `
                <tr>
                    <td class="text-center font-medium">${index + 1}</td>
                    <td>
                        <div class="font-medium">${item.productName || 'Product'}</div>
                        <div class="text-gray" style="font-size: 10px;">
                            ${item.productSku ? `SKU: ${item.productSku}` : ''}
                            ${item.productDescription ? ` | ${item.productDescription}` : ''}
                        </div>
                    </td>
                    <td class="text-center font-medium">${item.qty || 0}</td>
                    <td class="text-center ${(item.freeQty && item.freeQty > 0) ? 'font-bold' : 'text-gray'}" style="color: ${(item.freeQty && item.freeQty > 0) ? '#059669' : '#6b7280'};">
                        ${item.freeQty || 0}
                        ${(item.freeQty && item.freeQty > 0) ? ' 🎁' : ''}
                    </td>
                    <td class="text-right">₹${parseFloat(item.offerPrice || 0).toFixed(2)}</td>
                    <td class="text-center">${item.discount || 0}%</td>
                    <td class="text-right">₹${(() => {
                        const qty = parseInt(item.qty || 0);
                        const rate = parseFloat(item.offerPrice || 0);
                        const pct = parseFloat(item.discount || 0);
                        // Prefer stored DiscountAmount if present; fallback to computed
                        const stored = parseFloat(item.DiscountAmount);
                        if (!isNaN(stored)) return stored.toFixed(2);
                        const lineSub = Math.round((isNaN(qty) ? 0 : qty) * (isNaN(rate) ? 0 : rate));
                        const discAmt = Math.round(lineSub * ((isNaN(pct) ? 0 : pct) / 100));
                        return discAmt.toFixed(2);
                    })()}</td>
                    <td class="text-right">₹${parseFloat(item.cgst || 0).toFixed(2)}</td>
                    <td class="text-right">₹${parseFloat(item.sgst || 0).toFixed(2)}</td>
                    <td class="text-right font-bold">₹${parseFloat(item.total || 0).toFixed(2)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <!-- Summary Section -->
        <div class="summary-section">
            <div class="terms">
                <h4>📋 Terms & Conditions:</h4>
                <ul>
                    <li>All pharmaceutical products are subject to batch verification</li>
                    <li>Free goods 🎁 are promotional items and subject to availability</li>
                    <li>Delivery within 24-48 hours of order confirmation</li>
                    <li>Returns accepted within 7 days for unopened items</li>
                    <li>Free goods cannot be returned or exchanged separately</li>
                    <li>Payment terms as per agreement</li>
                    <li>All disputes subject to local jurisdiction</li>
                    <li>Goods once sold will not be taken back</li>
                    <li>Subject to Hyderabad jurisdiction only</li>
                </ul>
            </div>
            <div class="summary">
                <h4>💰 Invoice Summary</h4>
                <div class="summary-row">
                    <span>Subtotal:</span>
                    <span>₹${parseFloat(order.subTotal || 0).toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Total Discount:</span>
                    <span>-₹${(() => {
                        const totalDisc = orderDetails.reduce((sum, item) => {
                            const stored = parseFloat(item.DiscountAmount);
                            if (!isNaN(stored)) return sum + stored;
                            const qty = parseInt(item.qty || 0);
                            const rate = parseFloat(item.offerPrice || 0);
                            const pct = parseFloat(item.discount || 0);
                            const lineSub = Math.round((isNaN(qty) ? 0 : qty) * (isNaN(rate) ? 0 : rate));
                            const discAmt = Math.round(lineSub * ((isNaN(pct) ? 0 : pct) / 100));
                            return sum + discAmt;
                        }, 0);
                        return parseFloat(totalDisc || 0).toFixed(2);
                    })()}</span>
                </div>
                <div class="summary-row">
                    <span>Taxable Amount:</span>
                    <span>₹${(() => {
                        const subtotal = parseFloat(order.subTotal || 0);
                        const totalDisc = orderDetails.reduce((sum, item) => {
                            const stored = parseFloat(item.DiscountAmount);
                            if (!isNaN(stored)) return sum + stored;
                            const qty = parseInt(item.qty || 0);
                            const rate = parseFloat(item.offerPrice || 0);
                            const pct = parseFloat(item.discount || 0);
                            const lineSub = Math.round((isNaN(qty) ? 0 : qty) * (isNaN(rate) ? 0 : rate));
                            const discAmt = Math.round(lineSub * ((isNaN(pct) ? 0 : pct) / 100));
                            return sum + discAmt;
                        }, 0);
                        return (Math.round(subtotal - (totalDisc || 0))).toFixed(2);
                    })()}</span>
                </div>
                <div class="summary-row">
                    <span>CGST (6%):</span>
                    <span>₹${parseFloat(order.totalCGST || 0).toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>SGST (6%):</span>
                    <span>₹${parseFloat(order.totalSGST || 0).toFixed(2)}</span>
                </div>
                <div class="summary-row" style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
                    <span><strong>Free Items:</strong></span>
                    <span style="color: #059669; font-weight: bold;">${orderDetails.reduce((sum, item) => sum + (parseInt(item.freeQty) || 0), 0)} units 🎁</span>
                </div>
                <div class="summary-row total">
                    <span>Grand Total:</span>
                    <span>₹${(() => {
                        const subtotal = parseFloat(order.subTotal || 0);
                        const cgst = parseFloat(order.totalCGST || 0);
                        const sgst = parseFloat(order.totalSGST || 0);
                        const totalDisc = orderDetails.reduce((sum, item) => {
                            const stored = parseFloat(item.DiscountAmount);
                            if (!isNaN(stored)) return sum + stored;
                            const qty = parseInt(item.qty || 0);
                            const rate = parseFloat(item.offerPrice || 0);
                            const pct = parseFloat(item.discount || 0);
                            const lineSub = Math.round((isNaN(qty) ? 0 : qty) * (isNaN(rate) ? 0 : rate));
                            const discAmt = Math.round(lineSub * ((isNaN(pct) ? 0 : pct) / 100));
                            return sum + discAmt;
                        }, 0);
                        const taxable = Math.round(subtotal - (totalDisc || 0));
                        return parseFloat(Math.round(taxable + cgst + sgst)).toFixed(2);
                    })()}</span>
                </div>
                <div class="amount-words">
                    <div class="label">Amount in Words:</div>
                    <div class="value">${this.numberToWords(order.grandTotal || 0)}</div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>Thank you for your business!</strong></p>
            <p>This is a computer-generated invoice and does not require a signature.</p>
            <p>For any queries, please contact us at orders@enercon360.com or +91 40 1234 5678</p>
        </div>
    </div>
</body>
</html>`;
        
        return invoiceHTML;
    }

    numberToWords(num) {
        if (num === 0) return 'Zero Rupees Only';
        
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        
        function convertHundreds(n) {
            let result = '';
            if (n >= 100) {
                result += ones[Math.floor(n / 100)] + ' Hundred ';
                n %= 100;
            }
            if (n >= 20) {
                result += tens[Math.floor(n / 10)] + ' ';
                n %= 10;
            }
            if (n >= 10) {
                result += teens[n - 10] + ' ';
                n = 0;
            }
            if (n > 0) {
                result += ones[n] + ' ';
            }
            return result;
        }
        
        let rupees = Math.floor(num);
        let paise = Math.round((num - rupees) * 100);
        
        let result = '';
        
        if (rupees >= 10000000) {
            result += convertHundreds(Math.floor(rupees / 10000000)) + 'Crore ';
            rupees %= 10000000;
        }
        if (rupees >= 100000) {
            result += convertHundreds(Math.floor(rupees / 100000)) + 'Lakh ';
            rupees %= 100000;
        }
        if (rupees >= 1000) {
            result += convertHundreds(Math.floor(rupees / 1000)) + 'Thousand ';
            rupees %= 1000;
        }
        if (rupees > 0) {
            result += convertHundreds(rupees);
        }
        
        result += 'Rupees';
        
        if (paise > 0) {
            result += ' and ' + convertHundreds(paise) + 'Paise';
        }
        
        return result.trim() + ' Only';
    }

    async generateInvoiceFile(orderData) {
        const invoiceHTML = this.generateInvoiceHTML(orderData);
        const fileName = `invoice-${orderData.order.id}-${Date.now()}.pdf`;
        const filePath = path.join(this.invoicesDir, fileName);
        
        let browser;
        try {
            // Ensure target directory exists before writing the PDF
            await this._dirReady;

            // Build robust launch options for server environments
            const launchArgs = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // use /tmp instead of /dev/shm
                '--disable-extensions',
                '--disable-gpu',
                '--font-render-hinting=none'
            ];

            const execPathFromEnv = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
            const baseOptions = {
                headless: 'new',
                args: launchArgs,
                executablePath: execPathFromEnv || undefined
            };

            // Try launching with base options; if it fails, retry with common executable paths
            const candidateExecPaths = [
                execPathFromEnv,
                // Linux
                '/usr/bin/google-chrome-stable',
                '/usr/bin/google-chrome',
                '/usr/bin/chromium-browser',
                '/usr/bin/chromium',
                // Windows
                'C:/Program Files/Google/Chrome/Application/chrome.exe',
                'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
                // macOS
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            ].filter(Boolean);

            let lastError;
            for (let i = 0; i < Math.max(1, candidateExecPaths.length); i++) {
                const executablePath = candidateExecPaths[i];
                try {
                    browser = await puppeteer.launch({
                        ...baseOptions,
                        executablePath: executablePath || baseOptions.executablePath
                    });
                    break;
                } catch (err) {
                    lastError = err;
                    // Continue trying with next candidate
                }
            }

            if (!browser) {
                // If still not launched, throw the last error with guidance
                const guidance = 'Puppeteer failed to launch. On servers, set PUPPETEER_EXECUTABLE_PATH to your Chrome/Chromium binary and ensure required system libs are installed.';
                throw new Error(`${guidance} ${lastError ? `Inner error: ${lastError.message}` : ''}`.trim());
            }
            
            const page = await browser.newPage();
            
            // Set content and generate PDF
            await page.setContent(invoiceHTML, { 
                waitUntil: 'networkidle0' 
            });
            
            // Generate PDF with A4 format
            await page.pdf({
                path: filePath,
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                }
            });
            
            return {
                fileName,
                filePath,
                url: `/invoices/${fileName}`
            };
            
        } catch (error) {
            // Optionally write the HTML for debugging if PDF generation fails
            const htmlPath = filePath.replace(/\.pdf$/, '.html');
            try {
                await fs.writeFile(htmlPath, invoiceHTML, 'utf8');
            } catch (_) { /* ignore */ }
            // Optional HTML fallback to avoid breaking flows in restricted servers
            if ((process.env.INVOICE_FALLBACK_HTML || '').toLowerCase() === 'true') {
                console.warn('Puppeteer failed; serving HTML invoice fallback instead of PDF. Error:', error.message);
                const htmlName = fileName.replace(/\.pdf$/, '.html');
                return {
                    fileName: htmlName,
                    filePath: htmlPath,
                    url: `/invoices/${htmlName}`
                };
            }
            console.error('Error generating PDF:', error);
            throw new Error('Failed to generate PDF invoice');
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    async getInvoice(fileName) {
        const filePath = path.join(this.invoicesDir, fileName);
        try {
            // For PDF files, we'll serve them directly via static file serving
            const stats = await fs.stat(filePath);
            if (stats.isFile()) {
                return filePath; // Return file path for PDF serving
            }
            throw new Error('File not found');
        } catch (error) {
            throw new Error('Invoice file not found');
        }
    }
}

module.exports = new InvoiceService();
