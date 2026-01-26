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
    await supabase.auth.signOut()
    router.push('/login')
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
    if (!buyPrice || isNaN(buyPriceNum) || buyPriceNum <= 0) {
      toast.error('Valid buy price is required')
      return false
    }

    const sellPriceNum = parseFloat(sellPrice)
    if (!sellPrice || isNaN(sellPriceNum) || sellPriceNum <= 0) {
      toast.error('Valid sell price is required')
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
      const buyPriceNum = parseFloat(buyPrice)
      const sellPriceNum = parseFloat(sellPrice)

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-blue-600 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <DashboardLayoutWrapper userEmail={userEmail} onLogout={handleLogout}>
      <Toaster position="top-right" />
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Add New Product</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Form */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Product Information</h3>
            <div className="space-y-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter product code"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 bg-white"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must be unique in the system
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter product name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 bg-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter product description"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-400 bg-white"
                />
              </div>

              {/* Stock Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Stock Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={stockAmount}
                  onChange={(e) => setStockAmount(e.target.value === '' ? '' : parseInt(e.target.value))}
                  onWheel={(e) => e.currentTarget.blur()}
                  min="0"
                  placeholder="Enter stock amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-gray-900 placeholder-gray-400 bg-white"
                />
              </div>

              {/* Buy Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buy Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  min="0"
                  step="0.01"
                  placeholder="Enter buy price"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-gray-900 placeholder-gray-400 bg-white"
                />
              </div>

              {/* Sell Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sell Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  min="0"
                  step="0.01"
                  placeholder="Enter sell price"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-gray-900 placeholder-gray-400 bg-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Adding Product...' : 'Add Product'}
                </button>
                <button
                  onClick={handleReset}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Current Products List */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Existing Products</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-3">
                Total Products: <span className="font-semibold text-gray-800">{items.length}</span>
              </p>
              <div className="max-h-[600px] overflow-y-auto border border-gray-200 rounded-lg bg-white">
                <table className="min-w-full border-collapse">
                  <thead className="bg-blue-500 text-white sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-sm">Code</th>
                      <th className="px-3 py-2 text-left font-semibold text-sm">Name</th>
                      <th className="px-3 py-2 text-right font-semibold text-sm">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                          No products yet
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-700 text-sm">{item.code}</td>
                          <td className="px-3 py-2 text-gray-700 text-sm">{item.name}</td>
                          <td className={`px-3 py-2 text-right text-sm font-semibold ${
                            item.current_stock <= 5 ? 'text-red-600' : 'text-gray-700'
                          }`}>
                            {item.current_stock}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-blue-500 text-xl">ℹ️</span>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Important Notes:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Product code must be unique - check the existing products list on the right</li>
                <li>• All fields marked with <span className="text-red-500">*</span> are required</li>
                <li>• Buy and sell prices must be greater than zero</li>
                <li>• Stock amount defaults to 0 if not specified</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayoutWrapper>
  )
}
