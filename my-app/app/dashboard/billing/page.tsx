'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import DashboardLayoutWrapper from '@/components/DashboardLayoutWrapper'
import NewBillTab from '@/components/billing/NewBillTab'
import HistoryTab from '@/components/billing/HistoryTab'

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
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
        setLoading(false)
      } catch (err) {
        console.error('Error validating session:', err)
        setLoading(false)
        router.push('/login')
      }
    }

    void checkUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayoutWrapper userEmail={userEmail} onLogout={handleLogout}>
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Billing & Invoices</h1>
        
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-4 sm:mb-6">
          <nav className="-mb-px flex space-x-4 sm:space-x-8">
            <button
              onClick={() => setActiveTab('new')}
              className={`${
                activeTab === 'new'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              New Bill
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Purchase History
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'new' ? <NewBillTab /> : <HistoryTab />}
        </div>
      </div>
    </DashboardLayoutWrapper>
  )
}
