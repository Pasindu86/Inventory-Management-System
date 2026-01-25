# Inventory Billing & Invoice System - Setup Instructions

## Database Setup

### 1. Run the RPC Function in Supabase

1. Open your Supabase project dashboard
2. Go to the **SQL Editor**
3. Open the file `database/create_complete_bill.sql`
4. Copy and paste the SQL code into the Supabase SQL Editor
5. Click **Run** to create the function

### 2. Verify Database Tables

Make sure you have these tables with the correct structure:

**items_details**
- id (bigint, primary key)
- code (text)
- name (text)
- sell_price (numeric)
- current_stock (integer)

**bills**
- id (bigint, primary key)
- name (text)
- phone (text)
- discount_price (numeric, default 0)
- courier_price (numeric, default 0)
- total_amount (numeric)
- created_at (timestamp, default now())

**bill-items** (note: table name has a hyphen)
- id (bigint, primary key)
- bill_id (bigint, foreign key to bills.id)
- item_id (bigint, foreign key to items_details.id)
- quantity (integer)
- price (numeric)
- created_at (timestamp, default now())

## Frontend Setup

### 1. Environment Variables

Make sure your `.env.local` file has:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 2. Dependencies

All required dependencies have been installed:
- jspdf (for PDF generation)
- react-hot-toast (for notifications)

### 3. File Structure

The following files have been created:

```
my-app/
├── app/
│   └── dashboard/
│       └── billing/
│           └── page.tsx          # Main billing page with tabs
├── components/
│   └── billing/
│       ├── NewBillTab.tsx        # New bill creation
│       └── HistoryTab.tsx        # Purchase history
├── lib/
│   ├── supabase.ts               # Supabase client
│   └── generateInvoice.ts        # PDF generation
└── database/
    └── create_complete_bill.sql  # RPC function
```

## Features

### New Bill Tab
- **Item Search**: Search items by code or name
- **Cart Management**: Add/remove items, adjust quantities
- **Stock Validation**: Prevents overselling
- **Customer Info**: Optional customer name and phone
- **Pricing**: Automatic calculation with discount and courier fees
- **Invoice Generation**: Automatic PDF download after successful sale

### Purchase History Tab
- **Search**: Filter by invoice #, customer name, or phone
- **Sorting**: Newest bills first
- **Summary Stats**: Total bills, revenue, and discounts
- **Responsive Table**: Clean display of all bills

### Invoice PDF
- Business name: BENLY PARTS LK
- Phone numbers: 0758280611 / 0768280611
- Itemized list with quantities and prices
- Discount and courier fees
- Grand total
- Auto-download after sale

## Usage

1. Navigate to `/dashboard/billing`
2. Use the **New Bill** tab to create sales
3. Search and add items to cart
4. Enter customer details (optional)
5. Add discount/courier fees if needed
6. Click "Complete Sale & Generate Invoice"
7. PDF will automatically download
8. View sales history in the **Purchase History** tab

## Notes

- Stock is automatically decreased after each sale
- Bills are created atomically (all-or-nothing)
- Error handling for insufficient stock
- Loading states and success/error notifications
- Professional UI with Tailwind CSS
