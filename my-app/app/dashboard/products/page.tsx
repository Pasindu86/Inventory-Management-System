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
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No products found. Add some products to get started.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
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
