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
      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'bg-white dark:bg-slate-800 shadow-elevated border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white',
          duration: 3000,
        }}
      />
      
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">Billing & Invoices</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Create bills and view purchase history</p>
        </div>
        
        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 p-1.5 inline-flex gap-1">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'new'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              New Bill
            </span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Purchase History
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
          {activeTab === 'new' ? <NewBillTab /> : <HistoryTab />}
        </div>
      </div>
    </DashboardLayoutWrapper>
  )
}
