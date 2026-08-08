import { jsPDF } from 'jspdf'

interface QuotationItem {
  name: string
  code: string
  quantity: number
  sell_price: number
  discount: number
}

interface QuotationData {
  items: QuotationItem[]
  subtotal: number
  totalDiscount: number
  total: number
}

export function generateQuotationPDF(data: QuotationData) {
  const doc = new jsPDF()
  
  // Set font
  doc.setFont('helvetica')
  
  // Header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('BENLY PARTS LK', 105, 20, { align: 'center' })
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  doc.text('Genuine Honda Benly & Vintage Motorcycle Parts', 105, 26, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('0758280611 / 0768280611', 105, 32, { align: 'center' })
  
  // Invoice Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('QUOTATION', 105, 45, { align: 'center' })
  
  // Invoice Details
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  // random quote number or just skip it
  const quoteRef = `QT-${Date.now().toString().slice(-6)}`
  doc.text(`Ref #: ${quoteRef}`, 20, 55)
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 61)
  doc.text(`Time: ${new Date().toLocaleTimeString()}`, 20, 67)
  
  // Table Header
  const startY = 80
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(240, 240, 240)
  doc.rect(20, startY, 170, 8, 'F')
  
  // Determine if any discounts exist
  const hasDiscounts = data.items.some(item => (item.discount || 0) > 0)
  
  // Dynamic column X coordinates
  const colItemX = 22
  const colQtyX = hasDiscounts ? 88 : 100
  const colPriceX = hasDiscounts ? 128 : 148
  const colDiscountX = 158 // Only if hasDiscounts
  const colTotalX = 190
  
  doc.text('Item', colItemX, startY + 5)
  doc.text('Qty', colQtyX, startY + 5)
  doc.text('Price', colPriceX, startY + 5, { align: 'right' })
  if (hasDiscounts) {
    doc.text('Discount', colDiscountX, startY + 5, { align: 'right' })
  }
  doc.text('Total', colTotalX, startY + 5, { align: 'right' })
  
  // Items
  doc.setFont('helvetica', 'normal')
  let currentY = startY + 15
  
  data.items.forEach((item) => {
    const itemTotal = (item.sell_price - item.discount) * item.quantity
    
    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage()
      currentY = 20
    }
    
    doc.text(item.name, colItemX, currentY)
    doc.text(item.quantity.toString(), colQtyX, currentY)
    doc.text(`Rs. ${item.sell_price.toFixed(2)}`, colPriceX, currentY, { align: 'right' })
    if (hasDiscounts) {
      doc.text(`Rs. ${item.discount.toFixed(2)}`, colDiscountX, currentY, { align: 'right' })
    }
    doc.text(`Rs. ${itemTotal.toFixed(2)}`, colTotalX, currentY, { align: 'right' })
    
    currentY += 7
  })
  
  // Separator line
  currentY += 5
  doc.setLineWidth(0.5)
  doc.line(20, currentY, 190, currentY)
  currentY += 10
  
  // Summary
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', 140, currentY)
  doc.text(`Rs. ${data.subtotal.toFixed(2)}`, 190, currentY, { align: 'right' })
  currentY += 7
  
  if (data.totalDiscount > 0) {
    doc.text('Total Discount:', 140, currentY)
    doc.text(`- Rs. ${data.totalDiscount.toFixed(2)}`, 190, currentY, { align: 'right' })
    currentY += 7
  }
  
  // Total
  currentY += 3
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Grand Total:', 140, currentY)
  doc.text(`Rs. ${data.total.toFixed(2)}`, 190, currentY, { align: 'right' })
  
  // Footer
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  doc.text('Thank you!', 105, 280, { align: 'center' })
  
  // Save PDF
  doc.save(`quotation_${quoteRef}.pdf`)
}
