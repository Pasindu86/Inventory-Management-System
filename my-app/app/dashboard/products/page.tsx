'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import DashboardLayoutWrapper from '@/components/DashboardLayoutWrapper'

interface ItemDetail {
  id: string
  code: string
  name: string
  description: string | null
  current_stock: number
  buy_price: number
  sell_price: number
}

export default function ProductsPage() {
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [items, setItems] = useState<ItemDetail[]>([])
  const [selectedItem, setSelectedItem] = useState<ItemDetail | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
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
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleRowClick = (item: ItemDetail) => {
    setSelectedItem(selectedItem?.id === item.id ? null : item)
  }

  // Filter items based on search query
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Products</h2>
        
        {/* Search Bar */}
        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 sm:py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-2 text-xs sm:text-sm text-gray-600">
              Found {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>
        
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-blue-500 text-white">
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
                    {searchQuery ? 'No products found matching your search.' : 'No products found. Add some products to get started.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <Fragment key={item.id}>
                    <tr
                      onClick={() => handleRowClick(item)}
                      className={`border-b border-gray-200 cursor-pointer transition-colors ${
                        selectedItem?.id === item.id 
                          ? 'bg-blue-50' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-700 text-sm sm:text-base">{item.code}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-700 text-sm sm:text-base">{item.name}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-gray-700 text-sm sm:text-base">{item.current_stock}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-gray-700 text-sm sm:text-base">
                        Rs {item.buy_price.toFixed(2)}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-gray-700 text-sm sm:text-base">
                        Rs {item.sell_price.toFixed(2)}
                      </td>
                    </tr>
                    {selectedItem?.id === item.id && item.description && (
                      <tr>
                        <td colSpan={5} className="px-2 sm:px-4 py-3 sm:py-4 bg-blue-50 border-b border-gray-200">
                          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
                            <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Description:</p>
                            <p className="text-gray-600 text-sm sm:text-base">{item.description}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </DashboardLayoutWrapper>
  )
}
