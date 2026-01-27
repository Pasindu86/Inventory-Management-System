'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import DashboardLayoutWrapper from '@/components/DashboardLayoutWrapper'
import toast, { Toaster } from 'react-hot-toast'

interface ItemDetail {
  id: string
  code: string
  name: string
  description: string | null
  current_stock: number
  buy_price: number
  sell_price: number
}

export default function NewProductPage() {
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [items, setItems] = useState<ItemDetail[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form fields
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [stockAmount, setStockAmount] = useState<number | ''>('')
  const [buyPrice, setBuyPrice] = useState<string>('')
  const [sellPrice, setSellPrice] = useState<string>('')
  
  const router = useRouter()

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

  const checkUser = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Supabase session error:', error)
        if (error.message?.toLowerCase().includes('invalid refresh token')) {
          await supabase.auth.signOut()
        }
      }

      if (!session) {
        setLoading(false)
        router.push('/login')
        return
      }

      setUserEmail(session.user.email || '')
      await fetchItems()
      setLoading(false)
    } catch (err) {
      console.error('Error validating session:', err)
      setLoading(false)
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    checkUser()
  }, [checkUser])

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items_details')
        .select('*')
        .order('code', { ascending: true })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      setItems(data || [])
    } catch (error: unknown) {
      console.error('Error fetching items:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch items'
      toast.error(errorMessage)
    }
  }

  const handleLogout = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Clear all Supabase cookies
      document.cookie.split(";").forEach((c) => {
        const cookieName = c.split("=")[0].trim()
        if (cookieName.startsWith('sb-')) {
          document.cookie = cookieName + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
        }
      })
      
      // Hard redirect to clear all state
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect even if there's an error
      window.location.href = '/login'
    }
  }

  const validateForm = (): boolean => {
    if (!code.trim()) {
      toast.error('Product code is required')
      return false
    }

    if (!name.trim()) {
      toast.error('Product name is required')
      return false
    }

    const stock = typeof stockAmount === 'number' ? stockAmount : 0
    if (stock < 0) {
      toast.error('Stock amount cannot be negative')
      return false
    }

    const buyPriceNum = parseFloat(buyPrice)
    if (buyPrice && (isNaN(buyPriceNum) || buyPriceNum < 0)) {
      toast.error('Buy price cannot be negative')
      return false
    }

    const sellPriceNum = parseFloat(sellPrice)
    if (sellPrice && (isNaN(sellPriceNum) || sellPriceNum < 0)) {
      toast.error('Sell price cannot be negative')
      return false
    }

    // Check if code already exists
    const codeExists = items.some(
      item => item.code.toLowerCase() === code.trim().toLowerCase()
    )
    
    if (codeExists) {
      toast.error(`Product code "${code}" already exists in the system`)
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const stock = typeof stockAmount === 'number' ? stockAmount : 0
      const buyPriceNum = buyPrice ? parseFloat(buyPrice) : 0
      const sellPriceNum = sellPrice ? parseFloat(sellPrice) : 0

      const { error } = await supabase
        .from('items_details')
        .insert({
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || null,
          current_stock: stock,
          buy_price: buyPriceNum,
          sell_price: sellPriceNum,
        })

      if (error) {
        console.error('Supabase insert error:', error)
        throw error
      }

      toast.success('Product added successfully!')
      
      // Reset form
      setCode('')
      setName('')
      setDescription('')
      setStockAmount('')
      setBuyPrice('')
      setSellPrice('')
      
      // Refresh items list
      await fetchItems()
    } catch (error: unknown) {
      console.error('Error adding product:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to add product'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setCode('')
    setName('')
    setDescription('')
    setStockAmount('')
    setBuyPrice('')
    setSellPrice('')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayoutWrapper userEmail={userEmail} onLogout={handleLogout}>
      <Toaster position="top-right" />
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Add New Product</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Create a new inventory item</p>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-xl">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="font-medium">{items.length} products in inventory</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Left Column: Form - Takes 3 columns on xl */}
          <div className="xl:col-span-3 bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Product Information</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Fill in the details below</p>
                </div>
              </div>
            </div>
            
            <form className="p-5 space-y-5" onSubmit={(e) => e.preventDefault()}>
              {/* Code & Name Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Product Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g., SKU-001"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-600 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono"
                  />
                  <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Must be unique</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter product name"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-600 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Description <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter product description..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-600 transition-all resize-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              {/* Stock & Prices Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Initial Stock <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={stockAmount}
                      onChange={(e) => setStockAmount(e.target.value === '' ? '' : parseInt(e.target.value))}
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={handleKeyDown}
                      min="0"
                      placeholder="0"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-600 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm">units</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Buy Price <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm">Rs</span>
                    <input
                      type="number"
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={handleKeyDown}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-600 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Sell Price <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm">Rs</span>
                    <input
                      type="number"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={handleKeyDown}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-600 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Profit Preview */}
              {buyPrice && sellPrice && parseFloat(buyPrice) > 0 && parseFloat(sellPrice) > 0 && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Profit Margin</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                        Rs {(parseFloat(sellPrice) - parseFloat(buyPrice)).toFixed(2)}
                      </span>
                      <span className="text-sm text-emerald-600 dark:text-emerald-500 ml-2">
                        ({(((parseFloat(sellPrice) - parseFloat(buyPrice)) / parseFloat(buyPrice)) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding Product...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Product
                    </span>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  disabled={isSubmitting}
                  className="px-6 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Current Products List - Takes 2 columns on xl */}
          <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Existing Products</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Reference for unique codes</p>
            </div>
            
            <div className="max-h-[500px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No products yet</p>
                  <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Add your first product above</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {items.map((item) => (
                    <div key={item.id} className="px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">{item.code}</span>
                          </div>
                          <p className="font-medium text-slate-900 dark:text-white truncate mt-1">{item.name}</p>
                        </div>
                        <div className={`text-sm font-semibold px-2 py-1 rounded-lg ${
                          item.current_stock <= 5 
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                            : item.current_stock <= 10
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        }`}>
                          {item.current_stock}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Quick Tips</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1.5">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Product codes must be unique - check the list on the right
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Use arrow keys (↑↓) to navigate between fields quickly
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  All fields marked with <span className="text-red-500">*</span> are required
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayoutWrapper>
  )
}
