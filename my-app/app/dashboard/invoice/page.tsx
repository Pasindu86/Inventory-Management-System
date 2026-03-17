'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import DashboardLayoutWrapper from '@/components/DashboardLayoutWrapper'
import CreateQuotation from '@/components/invoice/CreateQuotation'

export default function InvoicePage() {
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">Price List / Quotation</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Create and download quotation PDFs</p>
        </div>
        
        {/* Component Content */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
          <CreateQuotation />
        </div>
      </div>
    </DashboardLayoutWrapper>
  )
}
