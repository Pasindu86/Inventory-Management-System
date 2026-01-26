'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { generateInvoicePDF } from '@/lib/generateInvoice'

interface Item {
  id: string
  code: string
  name: string
  sell_price: number
  current_stock: number
}

interface CartItem extends Item {
  quantity: number
}

export default function NewBillTab() {
  const [searchTerm, setSearchTerm] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [filteredItems, setFilteredItems] = useState<Item[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [discountPrice, setDiscountPrice] = useState<number | ''>('')
  const [courierPrice, setCourierPrice] = useState<number | ''>('')
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  // Fetch all items on mount
  useEffect(() => {
    fetchItems()
  }, [])

  // Filter items based on search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredItems([])
      setShowDropdown(false)
      return
    }

    const filtered = items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredItems(filtered)
    setShowDropdown(true)
  }, [searchTerm, items])

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('items_details')
      .select('id, code, name, sell_price, current_stock')
      .gt('current_stock', 0)
      .order('name')

    if (error) {
      toast.error('Failed to fetch items')
      console.error(error)
    } else {
      const normalizedItems: Item[] = (data || []).map((item) => ({
        ...item,
        id: String(item.id),
      }))
      setItems(normalizedItems)
    }
  }

  const addToCart = (item: Item) => {
    const existingItem = cart.find((cartItem) => cartItem.id === item.id)
    
    if (existingItem) {
      if (existingItem.quantity >= item.current_stock) {
        toast.error(`Only ${item.current_stock} units available in stock`)
        return
      }
      setCart(
        cart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      )
      toast.success('Quantity increased')
    } else {
      setCart([...cart, { ...item, quantity: 1 }])
      toast.success('Item added to cart')
    }
    
    setSearchTerm('')
    setShowDropdown(false)
  }

  const updateQuantity = (id: string, quantity: number) => {
    const item = cart.find((cartItem) => cartItem.id === id)
    
    if (item && quantity > item.current_stock) {
      toast.error(`Only ${item.current_stock} units available`)
      return
    }
    
    if (quantity <= 0) {
      removeFromCart(id)
      return
    }
    
    setCart(
      cart.map((cartItem) =>
        cartItem.id === id ? { ...cartItem, quantity } : cartItem
      )
    )
  }

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id))
    toast.success('Item removed from cart')
  }

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.sell_price * item.quantity, 0)
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const discount = typeof discountPrice === 'number' ? discountPrice : 0
    const courier = typeof courierPrice === 'number' ? courierPrice : 0
    return subtotal - discount + courier
  }

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error('Please add items to cart')
      return
    }

    const total = calculateTotal()
    if (total < 0) {
      toast.error('Total amount cannot be negative')
      return
    }

    setIsLoading(true)

    try {
      // Prepare items for RPC
      const itemsForRPC = cart.map((item) => ({
        item_id: item.id,
        quantity: item.quantity,
        price: item.sell_price,
      }))

      // Call Supabase RPC function
      const { data, error } = await supabase.rpc('create_complete_bill', {
        p_name: customerName || 'Walk-in Customer',
        p_phone: customerPhone || '',
        p_address: customerAddress || '',
        p_discount: typeof discountPrice === 'number' ? discountPrice : 0,
        p_courier: typeof courierPrice === 'number' ? courierPrice : 0,
        p_total: total,
        p_items: itemsForRPC,
      })

      if (error) {
        console.error('Supabase RPC Error:', error)
        throw new Error(error.message || 'Failed to call database function')
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from database function')
      }

      const result = data[0]
      
      if (!result || !result.success) {
        throw new Error(result?.message || 'Failed to create bill')
      }

      toast.success('Bill created successfully!')

      // Generate PDF invoice
      generateInvoicePDF({
        billId: result.bill_id,
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || '',
        customerAddress: customerAddress || '',
        items: cart,
        subtotal: calculateSubtotal(),
        discount: typeof discountPrice === 'number' ? discountPrice : 0,
        courier: typeof courierPrice === 'number' ? courierPrice : 0,
        total: total,
      })

      // Reset form
      setCart([])
      setCustomerName('')
      setCustomerPhone('')
      setCustomerAddress('')
      setDiscountPrice('')
      setCourierPrice('')
      fetchItems() // Refresh items to update stock
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to create bill')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column: Item Search & Cart */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">Add Items</h2>
          
          {/* Search Bar */}
          <div className="relative mb-4 sm:mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search items by code or name..."
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 bg-white"
            />
            
            {/* Dropdown */}
            {showDropdown && filteredItems.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-gray-100 border-b last:border-b-0"
                  >
                    <div className="text-sm sm:text-base font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      Code: {item.code} | Price: Rs. {item.sell_price.toFixed(2)} | Stock: {item.current_stock}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart */}
          <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-gray-800">Cart Items</h3>
          {cart.length === 0 ? (
            <p className="text-sm sm:text-base text-gray-500 text-center py-6 sm:py-8">No items in cart</p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm sm:text-base font-medium truncate text-gray-900">{item.name}</h4>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">Rs. {item.sell_price.toFixed(2)}</p>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300 text-sm sm:text-base text-gray-900 font-semibold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                        className="w-12 sm:w-16 text-center border border-gray-300 rounded px-1 sm:px-2 py-1 text-sm text-gray-900 bg-white"
                        min="1"
                        max={item.current_stock}
                      />
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300 text-sm sm:text-base text-gray-900 font-semibold"
                      >
                        +
                      </button>
                    </div>
                    
                    <div className="w-20 sm:w-24 text-right text-sm sm:text-base font-medium text-gray-900">
                      Rs. {(item.sell_price * item.quantity).toFixed(2)}
                    </div>
                    
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-600 hover:text-red-800 ml-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Customer Info & Summary */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">Bill Details</h2>
          
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name (Optional)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter phone number"
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address (Optional)
              </label>
              <textarea
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Enter customer address"
                rows={2}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-400 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Price (Optional)
              </label>
              <input
                type="number"
                value={discountPrice}
                onChange={(e) => setDiscountPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-gray-900 placeholder-gray-400 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Courier Price (Optional)
              </label>
              <input
                type="number"
                value={courierPrice}
                onChange={(e) => setCourierPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-gray-900 placeholder-gray-400 bg-white"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-700 font-medium">Subtotal:</span>
              <span className="font-medium text-gray-900">Rs. {calculateSubtotal().toFixed(2)}</span>
            </div>
            
            {(typeof discountPrice === 'number' && discountPrice > 0) && (
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-700 font-medium">Discount:</span>
                <span className="font-medium text-red-600">- Rs. {discountPrice.toFixed(2)}</span>
              </div>
            )}

            {(typeof courierPrice === 'number' && courierPrice > 0) && (
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-700 font-medium">Courier:</span>
                <span className="font-medium text-gray-900">+ Rs. {courierPrice.toFixed(2)}</span>
              </div>
            )}
            
            <div className="border-t border-gray-300 pt-2 mt-2">
              <div className="flex justify-between text-base sm:text-lg font-bold">
                <span className="text-gray-900">Total:</span>
                <span className="text-blue-600">Rs. {calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || cart.length === 0}
            className="w-full mt-4 sm:mt-6 bg-blue-600 text-white py-2.5 sm:py-3 px-4 rounded-lg text-sm sm:text-base font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Processing...' : 'Complete Sale & Generate Invoice'}
          </button>
        </div>
      </div>
    </div>
  )
}
