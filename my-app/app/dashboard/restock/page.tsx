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
  const [stockToAdd, setStockToAdd] = useState<number>(0)
  const [newBuyPrice, setNewBuyPrice] = useState<string>('')
  const [newSellPrice, setNewSellPrice] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()

  const checkUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/login')
    } else {
      setUserEmail(session.user.email || '')
      await fetchItems()
      setLoading(false)
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
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectItem = (item: ItemDetail) => {
    setSelectedItem(item)
    setStockToAdd(0)
    setNewBuyPrice(item.buy_price.toString())
    setNewSellPrice(item.sell_price.toString())
  }

  const handleUpdate = async () => {
    if (!selectedItem) return

    // Validate inputs
    const buyPrice = newBuyPrice ? parseFloat(newBuyPrice) : selectedItem.buy_price
    const sellPrice = newSellPrice ? parseFloat(newSellPrice) : selectedItem.sell_price

    if (isNaN(buyPrice) || buyPrice < 0) {
      toast.error('Invalid buy price')
      return
    }

    if (isNaN(sellPrice) || sellPrice < 0) {
      toast.error('Invalid sell price')
      return
    }

    if (stockToAdd < 0) {
      toast.error('Stock to add cannot be negative')
      return
    }

    if (stockToAdd === 0 && buyPrice === selectedItem.buy_price && sellPrice === selectedItem.sell_price) {
      toast.error('No changes to update')
      return
    }

    setIsUpdating(true)

    try {
      const newStock = selectedItem.current_stock + stockToAdd

      const { error } = await supabase
        .from('items_details')
        .update({
          current_stock: newStock,
          buy_price: buyPrice,
          sell_price: sellPrice,
        })
        .eq('id', selectedItem.id)

      if (error) throw error

      toast.success('Item updated successfully!')
      
      // Reset form and refresh items
      setSelectedItem(null)
      setStockToAdd(0)
      setNewBuyPrice('')
      setNewSellPrice('')
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
    setStockToAdd(0)
    setNewBuyPrice('')
    setNewSellPrice('')
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
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Restock Inventory</h2>
        
        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by code or name..."
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Items List */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Select Item</h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="max-h-[600px] overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-blue-500 text-white sticky top-0">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-sm sm:text-base">Code</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-sm sm:text-base">Name</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-sm sm:text-base">Stock</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-sm sm:text-base">Buy Price</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-sm sm:text-base">Sell Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                            No products found
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item) => (
                          <tr
                            key={item.id}
                            onClick={() => handleSelectItem(item)}
                            className={`border-b border-gray-200 cursor-pointer transition-colors ${
                              selectedItem?.id === item.id 
                                ? 'bg-blue-100' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-700 text-sm sm:text-base">{item.code}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-700 text-sm sm:text-base">{item.name}</td>
                            <td className={`px-2 sm:px-4 py-2 sm:py-3 text-right text-sm sm:text-base font-semibold ${
                              item.current_stock <= 5 ? 'text-red-600' : 'text-gray-700'
                            }`}>
                              {item.current_stock}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-gray-700 text-sm sm:text-base">
                              Rs {item.buy_price.toFixed(2)}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-gray-700 text-sm sm:text-base">
                              Rs {item.sell_price.toFixed(2)}
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

          {/* Right Column: Update Form */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Update Details</h3>
            {!selectedItem ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                Select an item from the list to update stock and prices
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                {/* Item Info */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="font-bold text-lg text-gray-800">{selectedItem.name}</h4>
                  <p className="text-sm text-gray-600">Code: {selectedItem.code}</p>
                  {selectedItem.description && (
                    <p className="text-sm text-gray-600 mt-2">{selectedItem.description}</p>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm font-semibold">
                      Current Stock: <span className={selectedItem.current_stock <= 5 ? 'text-red-600' : 'text-green-600'}>
                        {selectedItem.current_stock}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Stock Addition */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={stockToAdd}
                    onChange={(e) => setStockToAdd(parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter quantity to add"
                  />
                  {stockToAdd > 0 && (
                    <p className="mt-1 text-sm text-green-600">
                      New stock will be: {selectedItem.current_stock + stockToAdd}
                    </p>
                  )}
                </div>

                {/* Buy Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buy Price (Optional)
                  </label>
                  <input
                    type="number"
                    value={newBuyPrice}
                    onChange={(e) => setNewBuyPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter new buy price"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Current: Rs {selectedItem.buy_price.toFixed(2)}
                  </p>
                </div>

                {/* Sell Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sell Price (Optional)
                  </label>
                  <input
                    type="number"
                    value={newSellPrice}
                    onChange={(e) => setNewSellPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter new sell price"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Current: Rs {selectedItem.sell_price.toFixed(2)}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? 'Updating...' : 'Update Item'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isUpdating}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Items</p>
            <p className="text-2xl font-bold text-blue-600">{items.length}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Low Stock Items (≤5)</p>
            <p className="text-2xl font-bold text-red-600">
              {items.filter(item => item.current_stock <= 5).length}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Stock Value</p>
            <p className="text-2xl font-bold text-green-600">
              Rs {items.reduce((sum, item) => sum + (item.current_stock * item.buy_price), 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayoutWrapper>
  )
}
