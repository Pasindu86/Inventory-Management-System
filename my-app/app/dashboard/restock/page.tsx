'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import DashboardLayoutWrapper from '@/components/DashboardLayoutWrapper'
import toast from 'react-hot-toast'

interface ItemDetail {
  id: string
  code: string
  name: string
  description: string | null
  current_stock: number
  buy_price: number
  sell_price: number
}

export default function RestockPage() {
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [items, setItems] = useState<ItemDetail[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItem, setSelectedItem] = useState<ItemDetail | null>(null)
  const [stockToAdd, setStockToAdd] = useState<number | ''>('')
  const [newBuyPrice, setNewBuyPrice] = useState<string>('')
  const [newSellPrice, setNewSellPrice] = useState<string>('')
  const [newCode, setNewCode] = useState<string>('')
  const [newName, setNewName] = useState<string>('')
  const [newDescription, setNewDescription] = useState<string>('')
  const [showProductDetails, setShowProductDetails] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [stockOperation, setStockOperation] = useState<'add' | 'remove'>('add')
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

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching items:', error)
      toast.error('Failed to fetch items')
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

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectItem = (item: ItemDetail) => {
    setSelectedItem(item)
    setStockToAdd('')
    setNewBuyPrice(item.buy_price.toString())
    setNewSellPrice(item.sell_price.toString())
    setNewCode(item.code)
    setNewName(item.name)
    setNewDescription(item.description || '')
    setShowProductDetails(false)
    setStockOperation('add')
  }

  const handleUpdate = async () => {
    if (!selectedItem) return

    // Validate inputs
    const buyPrice = newBuyPrice ? parseFloat(newBuyPrice) : selectedItem.buy_price
    const sellPrice = newSellPrice ? parseFloat(newSellPrice) : selectedItem.sell_price
    const stockQuantity = typeof stockToAdd === 'number' ? stockToAdd : 0
    const code = newCode.trim() || selectedItem.code
    const name = newName.trim() || selectedItem.name
    const description = newDescription.trim() || null

    if (isNaN(buyPrice) || buyPrice < 0) {
      toast.error('Invalid buy price')
      return
    }

    if (isNaN(sellPrice) || sellPrice < 0) {
      toast.error('Invalid sell price')
      return
    }

    if (stockQuantity < 0) {
      toast.error('Stock quantity cannot be negative')
      return
    }

    if (stockOperation === 'remove' && stockQuantity > selectedItem.current_stock) {
      toast.error(`Cannot remove more than current stock (${selectedItem.current_stock} units)`)
      return
    }

    if (!code) {
      toast.error('Product code cannot be empty')
      return
    }

    if (!name) {
      toast.error('Product name cannot be empty')
      return
    }

    // Check if code already exists (if changed)
    if (code !== selectedItem.code) {
      const codeExists = items.some(
        item => item.code.toLowerCase() === code.toLowerCase() && item.id !== selectedItem.id
      )
      if (codeExists) {
        toast.error(`Product code "${code}" already exists`)
        return
      }
    }

    const hasChanges = 
      stockQuantity !== 0 || 
      buyPrice !== selectedItem.buy_price || 
      sellPrice !== selectedItem.sell_price ||
      code !== selectedItem.code ||
      name !== selectedItem.name ||
      description !== selectedItem.description

    if (!hasChanges) {
      toast.error('No changes to update')
      return
    }

    setIsUpdating(true)

    try {
      const newStock = stockOperation === 'add' 
        ? selectedItem.current_stock + stockQuantity
        : selectedItem.current_stock - stockQuantity

      const { error } = await supabase
        .from('items_details')
        .update({
          code: code,
          name: name,
          description: description,
          current_stock: newStock,
          buy_price: buyPrice,
          sell_price: sellPrice,
        })
        .eq('id', selectedItem.id)

      if (error) throw error

      toast.success('Item updated successfully!')
      
      // Reset form and refresh items
      setSelectedItem(null)
      setStockToAdd('')
      setNewBuyPrice('')
      setNewSellPrice('')
      setNewCode('')
      setNewName('')
      setNewDescription('')
      setShowProductDetails(false)
      setStockOperation('add')
      await fetchItems()
    } catch (error) {
      console.error('Error updating item:', error)
      toast.error('Failed to update item')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancel = () => {
    setSelectedItem(null)
    setStockToAdd('')
    setNewBuyPrice('')
    setNewSellPrice('')
    setNewCode('')
    setNewName('')
    setNewDescription('')
    setShowProductDetails(false)
    setStockOperation('add')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading inventory...</p>
        </div>
      </div>
    )
  }

  const lowStockCount = items.filter(item => item.current_stock <= 5).length
  const totalStockValue = items.reduce((sum, item) => sum + (item.current_stock * item.buy_price), 0)

  return (
    <DashboardLayoutWrapper userEmail={userEmail} onLogout={handleLogout}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Restock Inventory</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Update stock quantities and pricing</p>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 p-5 card-hover">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Items</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{items.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 p-5 card-hover">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${lowStockCount > 0 ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-emerald-500 to-emerald-600'} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Low Stock (≤5)</p>
                <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{lowStockCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 p-5 card-hover sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Stock Value</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">Rs {totalStockValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by code or name..."
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left Column: Items List */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Select Item to Update</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{filteredItems.length} items available</p>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No products found</p>
                  <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Try adjusting your search</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className={`px-5 py-4 cursor-pointer transition-all ${
                        selectedItem?.id === item.id 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">{item.code}</span>
                            {item.current_stock <= 5 && (
                              <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">Low Stock</span>
                            )}
                          </div>
                          <p className="font-medium text-slate-900 dark:text-white mt-1 truncate">{item.name}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-lg font-bold ${item.current_stock <= 5 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                            {item.current_stock}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">in stock</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                        <span>Buy: Rs {item.buy_price.toFixed(2)}</span>
                        <span>•</span>
                        <span>Sell: Rs {item.sell_price.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Update Form */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Update Details</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Modify stock and pricing</p>
            </div>
            
            {!selectedItem ? (
              <div className="py-16 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
                <p className="text-slate-600 dark:text-slate-300 font-medium">Select an item to update</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Click on any item from the list</p>
              </div>
            ) : (
              <div className="p-5 space-y-5">
                {/* Item Info Card */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-700 dark:to-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-mono bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-500">{selectedItem.code}</span>
                      <h4 className="font-bold text-lg text-slate-900 dark:text-white mt-2">{selectedItem.name}</h4>
                      {selectedItem.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{selectedItem.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                        selectedItem.current_stock <= 5 
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                          : selectedItem.current_stock <= 10
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      }`}>
                        <span className="text-lg font-bold">{selectedItem.current_stock}</span>
                        <span className="text-xs">units</span>
                      </div>
                    </div>
                  </div>
                </div>

                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  {/* Stock Operation Toggle */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Stock Operation
                    </label>
                    <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600">
                      <button
                        type="button"
                        onClick={() => {
                          setStockOperation('add')
                          setStockToAdd('')
                        }}
                        className={`flex-1 py-2.5 px-4 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          stockOperation === 'add'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStockOperation('remove')
                          setStockToAdd('')
                        }}
                        className={`flex-1 py-2.5 px-4 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          stockOperation === 'remove'
                            ? 'bg-red-500 text-white'
                            : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                        Remove Stock
                      </button>
                    </div>
                  </div>

                  {/* Stock Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {stockOperation === 'add' ? 'Quantity to Add' : 'Quantity to Remove'}
                    </label>
                    <input
                      type="number"
                      value={stockToAdd}
                      onChange={(e) => setStockToAdd(e.target.value === '' ? '' : parseInt(e.target.value))}
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={handleKeyDown}
                      min="0"
                      max={stockOperation === 'remove' ? selectedItem.current_stock : undefined}
                      className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border rounded-xl focus:ring-2 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-600 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 ${
                        stockOperation === 'remove' 
                          ? 'border-red-200 dark:border-red-800 focus:ring-red-500/20' 
                          : 'border-slate-200 dark:border-slate-600 focus:ring-blue-500/20'
                      }`}
                      placeholder={stockOperation === 'add' ? 'Enter quantity to add' : 'Enter quantity to remove'}
                    />
                    {(typeof stockToAdd === 'number' && stockToAdd > 0) && (
                      <div className={`mt-2 flex items-center gap-2 text-sm ${
                        stockOperation === 'add' 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {stockOperation === 'add' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                          )}
                        </svg>
                        New stock will be: <span className="font-semibold">
                          {stockOperation === 'add' 
                            ? selectedItem.current_stock + stockToAdd 
                            : Math.max(0, selectedItem.current_stock - stockToAdd)}
                        </span>
                        {stockOperation === 'remove' && stockToAdd > selectedItem.current_stock && (
                          <span className="text-red-500 dark:text-red-400 font-medium">(exceeds current stock!)</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Edit Product Details Toggle */}
                  <div className="border-t border-slate-200 dark:border-slate-600 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowProductDetails(!showProductDetails)}
                      className="flex items-center justify-between w-full text-left text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Product Details (Optional)
                      </span>
                      <svg className={`w-4 h-4 transition-transform ${showProductDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {showProductDetails && (
                      <div className="mt-4 space-y-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                        {/* Product Code */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Product Code
                          </label>
                          <input
                            type="text"
                            value={newCode}
                            onChange={(e) => setNewCode(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono"
                            placeholder="Enter product code"
                          />
                        </div>

                        {/* Product Name */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Product Name
                          </label>
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                            placeholder="Enter product name"
                          />
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Description <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
                          </label>
                          <textarea
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={3}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                            placeholder="Enter product description..."
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Price Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Buy Price */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Buy Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rs</span>
                        <input
                          type="number"
                          value={newBuyPrice}
                          onChange={(e) => setNewBuyPrice(e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          onKeyDown={handleKeyDown}
                          min="0"
                          step="0.01"
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-600 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        Current: Rs {selectedItem.buy_price.toFixed(2)}
                      </p>
                    </div>

                    {/* Sell Price */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Sell Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rs</span>
                        <input
                          type="number"
                          value={newSellPrice}
                          onChange={(e) => setNewSellPrice(e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          onKeyDown={handleKeyDown}
                          min="0"
                          step="0.01"
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-600 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        Current: Rs {selectedItem.sell_price.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleUpdate}
                      disabled={isUpdating}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98]"
                    >
                      {isUpdating ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Updating...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Update Item
                        </span>
                      )}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isUpdating}
                      className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayoutWrapper>
  )
}
