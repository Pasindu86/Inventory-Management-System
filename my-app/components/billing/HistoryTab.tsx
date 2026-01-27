'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Bill {
  id: string
  name: string
  phone: string
  address: string
  discount_price: number
  courier_price: number
  total_amount: number
  created_at: string
}

export default function HistoryTab() {
  const [bills, setBills] = useState<Bill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchBills()
  }, [])

  const fetchBills = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const normalizedBills = (data || []).map((bill) => ({
        ...bill,
        id: String(bill.id),
      }))
      setBills(normalizedBills)
    } catch (error: unknown) {
      toast.error('Failed to fetch bills')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredBills = bills.filter(
    (bill) =>
      bill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.phone.includes(searchTerm) ||
      bill.id.includes(searchTerm)
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Calculate monthly revenue (current month)
  const calculateMonthlyRevenue = () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    return filteredBills
      .filter(bill => {
        const billDate = new Date(bill.created_at)
        return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear
      })
      .reduce((sum, bill) => sum + bill.total_amount, 0)
  }

  // Calculate yearly revenue (current year)
  const calculateYearlyRevenue = () => {
    const currentYear = new Date().getFullYear()
    
    return filteredBills
      .filter(bill => {
        const billDate = new Date(bill.created_at)
        return billDate.getFullYear() === currentYear
      })
      .reduce((sum, bill) => sum + bill.total_amount, 0)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Purchase History</h2>
          
          {/* Search Bar */}
          <div className="relative max-w-md w-full sm:w-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search bills..."
              className="w-full sm:w-72 pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border-0 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Summary Stats */}
        {!isLoading && filteredBills.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/10 dark:to-blue-500/5 rounded-xl p-4 border border-blue-100 dark:border-blue-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Bills</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-white">{filteredBills.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-500/10 dark:to-emerald-500/5 rounded-xl p-4 border border-emerald-100 dark:border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">This Month</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">Rs. {calculateMonthlyRevenue().toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-500/10 dark:to-violet-500/5 rounded-xl p-4 border border-violet-100 dark:border-violet-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">This Year</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">Rs. {calculateYearlyRevenue().toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-500/10 dark:to-amber-500/5 rounded-xl p-4 border border-amber-100 dark:border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Discounts</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">Rs. {filteredBills.reduce((sum, bill) => sum + bill.discount_price, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">Loading bills...</p>
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">{searchTerm ? 'No bills found' : 'No bills yet'}</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">{searchTerm ? 'Try a different search term' : 'Create your first bill to get started'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-y border-slate-100 dark:border-slate-700">
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Invoice</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone</th>
                <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Address</th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredBills.map((bill) => (
                <tr key={bill.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 sm:px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-mono font-medium">
                      #{bill.id}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <p className="font-medium text-slate-800 dark:text-white">{bill.name || 'Walk-in Customer'}</p>
                    {bill.discount_price > 0 && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">Discount: Rs. {bill.discount_price.toFixed(2)}</p>
                    )}
                  </td>
                  <td className="hidden md:table-cell px-4 sm:px-6 py-4 text-slate-500 dark:text-slate-400">
                    {bill.phone || '-'}
                  </td>
                  <td className="hidden lg:table-cell px-4 sm:px-6 py-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                    {bill.address || '-'}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <span className="font-semibold text-slate-800 dark:text-white">Rs. {bill.total_amount.toFixed(2)}</span>
                    {bill.courier_price > 0 && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">+Rs. {bill.courier_price.toFixed(2)} courier</p>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right text-sm text-slate-500 dark:text-slate-400">
                    {formatDate(bill.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
