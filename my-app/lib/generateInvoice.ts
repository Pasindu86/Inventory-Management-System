import { jsPDF } from 'jspdf'

interface InvoiceItem {
  name: string
  quantity: number
  sell_price: number
}

interface InvoiceData {
  billId: string
  customerName: string
  customerPhone: string
  items: InvoiceItem[]
  subtotal: number
  discount: number
  courier: number
  total: number
}

export function generateInvoicePDF(data: InvoiceData) {
  const doc = new jsPDF()
  
  // Set font
  doc.setFont('helvetica')
  
  // Header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('BENLY PARTS LK', 105, 20, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('0758280611 / 0768280611', 105, 27, { align: 'center' })
  
  // Invoice Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', 105, 40, { align: 'center' })
  
  // Invoice Details
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Invoice #: ${data.billId}`, 20, 50)
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 56)
  doc.text(`Time: ${new Date().toLocaleTimeString()}`, 20, 62)
  
  // Customer Details
  if (data.customerName) {
    doc.setFont('helvetica', 'bold')
    doc.text('Customer Details:', 20, 72)
    doc.setFont('helvetica', 'normal')
    doc.text(`Name: ${data.customerName}`, 20, 78)
    if (data.customerPhone) {
      doc.text(`Phone: ${data.customerPhone}`, 20, 84)
    }
  }
  
  // Table Header
  const startY = data.customerName ? 95 : 75
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(240, 240, 240)
  doc.rect(20, startY, 170, 8, 'F')
  
  doc.text('Item', 22, startY + 5)
  doc.text('Qty', 130, startY + 5)
  doc.text('Price', 150, startY + 5)
  doc.text('Total', 175, startY + 5, { align: 'right' })
  
  // Items
  doc.setFont('helvetica', 'normal')
  let currentY = startY + 15
  
  data.items.forEach((item) => {
    const itemTotal = item.quantity * item.sell_price
    
    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage()
      currentY = 20
    }
    
    doc.text(item.name, 22, currentY)
    doc.text(item.quantity.toString(), 130, currentY)
    doc.text(`Rs. ${item.sell_price.toFixed(2)}`, 150, currentY)
    doc.text(`Rs. ${itemTotal.toFixed(2)}`, 188, currentY, { align: 'right' })
    
    currentY += 7
  })
  
  // Separator line
  currentY += 5
  doc.setLineWidth(0.5)
  doc.line(20, currentY, 190, currentY)
  currentY += 10
  
  // Summary
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', 130, currentY)
  doc.text(`Rs. ${data.subtotal.toFixed(2)}`, 188, currentY, { align: 'right' })
  currentY += 7
  
  if (data.discount > 0) {
    doc.text('Discount:', 130, currentY)
    doc.text(`- Rs. ${data.discount.toFixed(2)}`, 188, currentY, { align: 'right' })
    currentY += 7
  }
  
  if (data.courier > 0) {
    doc.text('Courier:', 130, currentY)
    doc.text(`Rs. ${data.courier.toFixed(2)}`, 188, currentY, { align: 'right' })
    currentY += 7
  }
  
  // Total
  currentY += 3
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Grand Total:', 130, currentY)
  doc.text(`Rs. ${data.total.toFixed(2)}`, 188, currentY, { align: 'right' })
  
  // Footer
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  doc.text('Thank you for your business!', 105, 280, { align: 'center' })
  
  // Save PDF
  doc.save(`invoice_${data.billId}_${Date.now()}.pdf`)
}
