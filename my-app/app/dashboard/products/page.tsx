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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayoutWrapper userEmail={userEmail} onLogout={handleLogout}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">Products</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your inventory items</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700 card-hover">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Items</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{items.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700 card-hover">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Stock Value</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">
                  Rs {items.reduce((sum, item) => sum + (item.current_stock * item.buy_price), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700 card-hover">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Potential Revenue</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">
                  Rs {items.reduce((sum, item) => sum + (item.current_stock * item.sell_price), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700 card-hover">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Potential Profit</p>
                <p className="text-xl font-bold text-emerald-600">
                  Rs {items.reduce((sum, item) => sum + (item.current_stock * (item.sell_price - item.buy_price)), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Products Table Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
          {/* Search Bar */}
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700">
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-700 border-0 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Found <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredItems.length}</span> {filteredItems.length === 1 ? 'item' : 'items'}
              </p>
            )}
          </div>
          
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Code</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 sm:px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stock</th>
                  <th className="px-4 sm:px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Buy Price</th>
                  <th className="px-4 sm:px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sell Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                          {searchQuery ? 'No products found matching your search.' : 'No products yet.'}
                        </p>
                        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                          {!searchQuery && 'Add some products to get started.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <Fragment key={item.id}>
                      <tr
                        onClick={() => handleRowClick(item)}
                        className={`cursor-pointer transition-colors ${
                          selectedItem?.id === item.id 
                            ? 'bg-blue-50 dark:bg-blue-500/10' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <td className="px-4 sm:px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-mono font-medium">
                            {item.code}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className="text-slate-800 dark:text-white font-medium">{item.name}</span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold ${
                            item.current_stock <= 5 
                              ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' 
                              : item.current_stock <= 15 
                                ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {item.current_stock}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right text-slate-600 dark:text-slate-400 font-medium">
                          Rs {item.buy_price.toFixed(2)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right text-slate-800 dark:text-white font-semibold">
                          Rs {item.sell_price.toFixed(2)}
                        </td>
                      </tr>
                      {selectedItem?.id === item.id && item.description && (
                        <tr>
                          <td colSpan={5} className="px-4 sm:px-6 py-4 bg-blue-50/50 dark:bg-blue-500/5">
                            <div className="bg-white dark:bg-slate-700 rounded-xl p-4 border border-blue-100 dark:border-slate-600">
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Description</p>
                              <p className="text-slate-700 dark:text-slate-300">{item.description}</p>
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
