'use client'

import React, { useState, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { generateQuotationPDF } from '@/lib/generateQuotationPDF'

interface Item {
  id: string
  code: string
  name: string
  sell_price: number
  buy_price: number
  current_stock: number
}

interface CartItem extends Item {
  quantity: number | ''
  edited_sell_price: number | ''
  line_discount: number | ''
}

export default function CreateQuotation() {
  const [searchTerm, setSearchTerm] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const hasFetchedItemsRef = useRef(false)

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

  const fetchItems = useCallback(async () => {
    if (itemsLoading) return

    setItemsLoading(true)
    const { data, error } = await supabase
      .from('items_details')
      .select('id, code, name, sell_price, buy_price, current_stock')
      .gt('current_stock', 0)
      .order('name')

    setItemsLoading(false)

    if (error) {
      toast.error('Failed to fetch items')
      console.error(error)
      hasFetchedItemsRef.current = false
    } else {
      const normalizedItems: Item[] = (data || []).map((item) => ({
        ...item,
        id: String(item.id),
      }))
      setItems(normalizedItems)
      hasFetchedItemsRef.current = true
    }
  }, [itemsLoading])

  const filteredItems = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase()
    if (!normalizedSearchTerm) return []

    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(normalizedSearchTerm) ||
        item.code.toLowerCase().includes(normalizedSearchTerm)
    )
  }, [searchTerm, items])

  const showDropdown = searchTerm.trim() !== '' && filteredItems.length > 0

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    if (value.trim() !== '' && !hasFetchedItemsRef.current) {
      void fetchItems()
    }
  }

  const addToCart = (item: Item) => {
    const existingItem = cart.find((cartItem) => cartItem.id === item.id)
    
    if (existingItem) {
      const currentQty = typeof existingItem.quantity === 'number' ? existingItem.quantity : 0
      if (currentQty >= item.current_stock) {
        toast.error(`Only ${item.current_stock} units available in stock`)
        return
      }
      setCart(
        cart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: currentQty + 1 }
            : cartItem
        )
      )
      toast.success('Quantity increased')
    } else {
      setCart([...cart, { ...item, quantity: 1, edited_sell_price: item.sell_price, line_discount: 0 }])
      toast.success('Item added to quotation')
    }
    
    setSearchTerm('')
  }

  const updateQuantity = (id: string, value: number | '') => {
    const item = cart.find((cartItem) => cartItem.id === id)
    
    if (item && typeof value === 'number' && value > item.current_stock) {
      toast.error(`Only ${item.current_stock} units available`)
      return
    }
    
    // Allow empty string for better typing experience, but prevent negative numbers
    if (typeof value === 'number' && value < 0) {
      return
    }
    
    setCart(
      cart.map((cartItem) =>
        cartItem.id === id ? { ...cartItem, quantity: value } : cartItem
      )
    )
  }

  const updatePrice = (id: string, value: number | '') => {
    if (typeof value === 'number' && value < 0) return
    setCart(
      cart.map((cartItem) =>
        cartItem.id === id ? { ...cartItem, edited_sell_price: value } : cartItem
      )
    )
  }

  const updateLineDiscount = (id: string, value: number | '') => {
    if (typeof value === 'number' && value < 0) return
    setCart(
      cart.map((cartItem) =>
        cartItem.id === id ? { ...cartItem, line_discount: value } : cartItem
      )
    )
  }

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id))
    toast.success('Item removed from quotation')
  }

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => {
      const price = typeof item.edited_sell_price === 'number' ? item.edited_sell_price : 0
      const qty = typeof item.quantity === 'number' ? item.quantity : 0
      return sum + price * qty
    }, 0)
  }

  const calculateTotalDiscount = () => {
    return cart.reduce((sum, item) => {
      const discount = typeof item.line_discount === 'number' ? item.line_discount : 0
      const qty = typeof item.quantity === 'number' ? item.quantity : 0
      return sum + discount * qty
    }, 0)
  }

  const calculateTotal = () => {
    return cart.reduce((sum, item) => {
      const price = typeof item.edited_sell_price === 'number' ? item.edited_sell_price : 0
      const discount = typeof item.line_discount === 'number' ? item.line_discount : 0
      const qty = typeof item.quantity === 'number' ? item.quantity : 0
      return sum + (price - discount) * qty
    }, 0)
  }

  const handleDownload = () => {
    if (cart.length === 0) {
      toast.error('Please add items to quotation')
      return
    }

    const total = calculateTotal()
    if (total < 0) {
      toast.error('Total amount cannot be negative')
      return
    }

    try {
      // Map items for PDF generator
      const pdfItems = cart.map(item => ({
        name: item.name,
        code: item.code,
        quantity: typeof item.quantity === 'number' ? item.quantity : 0,
        sell_price: typeof item.edited_sell_price === 'number' ? item.edited_sell_price : 0,
        discount: typeof item.line_discount === 'number' ? item.line_discount : 0
      })).filter(item => item.quantity > 0) // only include items with actual quantity

      generateQuotationPDF({
        items: pdfItems,
        subtotal: calculateSubtotal(),
        totalDiscount: calculateTotalDiscount(),
        total: total,
      })

      toast.success('Quotation downloaded successfully!')
    } catch (error) {
      toast.error('Failed to generate quotation')
      console.error(error)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left Column: Item Search & Cart */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Add Items to Quotation</h2>
            
            {/* Search Bar */}
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => {
                    if (!hasFetchedItemsRef.current) {
                      void fetchItems()
                    }
                  }}
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
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Quotation Items</h3>
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
                <p className="text-slate-500 dark:text-slate-400 font-medium">Your quotation is empty</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Search and add items above</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-150 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-100 dark:border-slate-600"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-800 dark:text-white truncate">{item.name}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Code: {item.code}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Buy Price: Rs. {item.buy_price?.toFixed(2) || '0.00'}</p>
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

                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="text-xs text-slate-500">Sell Price (Rs.)</label>
                            <input
                                type="number"
                                value={item.edited_sell_price}
                                onChange={(e) => updatePrice(item.id, e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="w-full mt-1 px-2 py-1.5 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500">Discount (Rs.) / Unit</label>
                            <input
                                type="number"
                                value={item.line_discount}
                                onChange={(e) => updateLineDiscount(item.id, e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="w-full mt-1 px-2 py-1.5 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-600">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, typeof item.quantity === 'number' ? item.quantity - 1 : 0)}
                          className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-500 hover:border-slate-300 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, e.target.value === '' ? '' : parseInt(e.target.value))}
                          className="w-16 text-center py-1.5 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          min="0"
                        />
                        <button
                          onClick={() => updateQuantity(item.id, typeof item.quantity === 'number' ? item.quantity + 1 : 1)}
                          className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-500 hover:border-slate-300 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                      
                      <p className="text-lg font-semibold text-slate-800 dark:text-white">
                        Rs. {(((typeof item.edited_sell_price === 'number' ? item.edited_sell_price : 0) - (typeof item.line_discount === 'number' ? item.line_discount : 0)) * (typeof item.quantity === 'number' ? item.quantity : 0)).toFixed(2)}
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
          {/* Summary */}
          <div className="bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-700/50 dark:to-slate-700 rounded-2xl p-5 border border-slate-200/50 dark:border-slate-600">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Quotation Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal (Before Discounts)</span>
                <span className="font-medium text-slate-800 dark:text-white">Rs. {calculateSubtotal().toFixed(2)}</span>
              </div>
              
              {calculateTotalDiscount() > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Total Discount</span>
                  <span className="font-medium text-red-500">- Rs. {calculateTotalDiscount().toFixed(2)}</span>
                </div>
              )}
              
              <div className="border-t border-slate-200 dark:border-slate-600 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-slate-800 dark:text-white">Total</span>
                  <span className="text-2xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Rs. {calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleDownload}
            disabled={cart.length === 0}
            className="w-full py-4 px-6 bg-linear-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Quotation PDF
          </button>
        </div>
      </div>
    </div>
  )
}
