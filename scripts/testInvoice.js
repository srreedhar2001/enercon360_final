// Quick local test to generate a sample invoice PDF
require('dotenv').config();
const path = require('path');
const invoiceService = require('../src/services/invoiceService');

async function run() {
  const order = {
    id: 999,
    orderDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    subTotal: 1234.56,
    totalCGST: 37.04,
    totalSGST: 37.04,
    grandTotal: 1308.64,
    paymentReceived: false
  };

  const orderDetails = [
    { productName: 'Test Product A', qty: 2, freeQty: 1, offerPrice: 250, discount: 5, cgst: 15, sgst: 15, total: 475 },
    { productName: 'Test Product B', qty: 1, freeQty: 0, offerPrice: 500, discount: 0, cgst: 15, sgst: 15, total: 530 }
  ];

  const counter = {
    CounterName: 'Test Counter',
    address: '123 Test Street',
    city: 'Hyderabad',
    state: 'TS',
    phone: '+91 99999 99999',
    gst: '36ABCDE1234F1Z5'
  };

  try {
    const result = await invoiceService.generateInvoiceFile({ order, orderDetails, counter });
    console.log('Invoice generated:', result);
    console.log('Open file:', path.resolve(result.filePath));
  } catch (e) {
    console.error('Failed:', e.message);
  }
}

run();
