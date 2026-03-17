'use client'

import React, { useState, useEffect, useCallback } from 'react'
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

  // Arrow key navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const form = e.currentTarget.form
      if (!form) return

      const formElements = Array.from(form.elements).filter(
        (el): el is HTMLInputElement | HTMLTextAreaElement =>
          (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
          !el.disabled &&
          el.type !== 'hidden'
      )

      const currentIndex = formElements.indexOf(e.currentTarget)
      if (currentIndex === -1) return

      let nextIndex: number
      if (e.key === 'ArrowDown') {
        nextIndex = currentIndex + 1 < formElements.length ? currentIndex + 1 : 0
      } else {
        nextIndex = currentIndex - 1 >= 0 ? currentIndex - 1 : formElements.length - 1
      }

      formElements[nextIndex]?.focus()
    }
  }, [])

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
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left Column: Item Search & Cart */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Add Items</h2>
            
            {/* Search Bar */}
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search items by code or name..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border-0 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              {/* Dropdown */}
              {showDropdown && filteredItems.length > 0 && (
                <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl shadow-elevated max-h-72 overflow-y-auto">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-600 border-b border-slate-100 dark:border-slate-600 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-800 dark:text-white">{item.name}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Code: {item.code}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-800 dark:text-white">Rs. {item.sell_price.toFixed(2)}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{item.current_stock} in stock</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Cart Items</h3>
              {cart.length > 0 && (
                <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-sm font-medium rounded-lg">
                  {cart.length} {cart.length === 1 ? 'item' : 'items'}
                </span>
              )}
            </div>
            
            {cart.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-600 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Your cart is empty</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Search and add items above</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-100 dark:border-slate-600"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-800 dark:text-white truncate">{item.name}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Rs. {item.sell_price.toFixed(2)} each</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-500 hover:border-slate-300 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                          className="w-16 text-center py-1.5 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          min="1"
                          max={item.current_stock}
                        />
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-500 hover:border-slate-300 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                      
                      <p className="text-lg font-semibold text-slate-800 dark:text-white">
                        Rs. {(item.sell_price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Customer Info & Summary */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Customer Details</h2>
            
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter customer name"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-0 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-0 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Address
                </label>
                <textarea
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter delivery address"
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-0 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Discount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rs.</span>
                    <input
                      type="number"
                      value={discountPrice}
                      onChange={(e) => setDiscountPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={handleKeyDown}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border-0 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-blue-500/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Courier
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rs.</span>
                    <input
                      type="number"
                      value={courierPrice}
                      onChange={(e) => setCourierPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={handleKeyDown}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border-0 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-blue-500/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700/50 dark:to-slate-700 rounded-2xl p-5 border border-slate-200/50 dark:border-slate-600">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Order Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span className="font-medium text-slate-800 dark:text-white">Rs. {calculateSubtotal().toFixed(2)}</span>
              </div>
              
              {(typeof discountPrice === 'number' && discountPrice > 0) && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Discount</span>
                  <span className="font-medium text-red-500">- Rs. {discountPrice.toFixed(2)}</span>
                </div>
              )}

              {(typeof courierPrice === 'number' && courierPrice > 0) && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Courier</span>
                  <span className="font-medium text-slate-800 dark:text-white">+ Rs. {courierPrice.toFixed(2)}</span>
                </div>
              )}
              
              <div className="border-t border-slate-200 dark:border-slate-600 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-slate-800 dark:text-white">Total</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Rs. {calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || cart.length === 0}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Complete Sale & Generate Invoice
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
