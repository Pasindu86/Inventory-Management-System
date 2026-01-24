'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface DashboardLayoutWrapperProps {
  children: ReactNode
  userEmail: string
  onLogout: () => void
}

export default function DashboardLayoutWrapper({ children, userEmail, onLogout }: DashboardLayoutWrapperProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const menuItems = [
    { name: 'Products', path: '/dashboard/products', icon: '📦' },
    { name: 'Billing', path: '/dashboard/billing', icon: '🧾' },
  ]

  const isActive = (path: string) => pathname === path

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Top Navigation */}
      <nav className="bg-white shadow-md">
        <div className="px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-md hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">Inventory Management</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden sm:inline text-gray-600 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{userEmail}</span>
              <button
                onClick={onLogout}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex relative">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <aside className={`
          fixed md:static top-0 left-0 z-50
          w-64 bg-white shadow-lg 
          min-h-screen md:min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)]
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-4 md:hidden border-b flex justify-between items-center">
            <h2 className="font-bold text-lg">Menu</h2>
            <button onClick={() => setSidebarOpen(false)} className="p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 hover:bg-blue-50'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 w-full md:w-auto p-3 sm:p-4 md:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
