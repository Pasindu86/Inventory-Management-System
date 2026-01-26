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
    <div className="p-3 sm:p-4 md:p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">Purchase History</h2>
        
        {/* Search Bar */}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by invoice #, customer name, or phone..."
          className="w-full max-w-md px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 bg-white"
        />
      </div>

      {/* Summary Stats - Moved to top */}
      {!isLoading && filteredBills.length > 0 && (
        <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Total Bills</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">{filteredBills.length}</p>
          </div>
          <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Monthly Revenue</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600">
              Rs. {calculateMonthlyRevenue().toFixed(2)}
            </p>
          </div>
          <div className="bg-emerald-50 p-3 sm:p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Year Revenue</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600">
              Rs. {calculateYearlyRevenue().toFixed(2)}
            </p>
          </div>
          <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Total Discounts</p>
            <p className="text-xl sm:text-2xl font-bold text-purple-600">
              Rs. {filteredBills.reduce((sum, bill) => sum + bill.discount_price, 0).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center py-8 sm:py-12">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="text-center py-8 sm:py-12 text-sm sm:text-base text-gray-500">
          {searchTerm ? 'No bills found matching your search' : 'No bills yet'}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Invoice #
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Customer
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Phone
                    </th>
                    <th className="hidden md:table-cell px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="hidden lg:table-cell px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Discount
                    </th>
                    <th className="hidden lg:table-cell px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Courier
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Total
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                        #{bill.id}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-medium">
                        {bill.name || 'Walk-in Customer'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {bill.phone || '-'}
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-500 max-w-xs truncate" title={bill.address}>
                        {bill.address || '-'}
                      </td>
                      <td className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {bill.discount_price > 0 ? `Rs. ${bill.discount_price.toFixed(2)}` : '-'}
                      </td>
                      <td className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {bill.courier_price > 0 ? `Rs. ${bill.courier_price.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-blue-600">
                        Rs. {bill.total_amount.toFixed(2)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {formatDate(bill.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
