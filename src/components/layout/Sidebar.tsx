"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  CalendarDays,
  BarChart3,
  Menu,
  X,
  BookMarked
} from 'lucide-react'
import { useState } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    title: 'Alunos',
    icon: Users,
    href: '/alunos',
  },
  {
    title: 'Professores',
    icon: GraduationCap,
    href: '/professores',
  },
  {
    title: 'Turmas',
    icon: BookOpen,
    href: '/turmas',
  },
  {
    title: 'Chamada',
    icon: ClipboardCheck,
    href: '/chamada',
  },
  {
    title: 'Escala',
    icon: CalendarDays,
    href: '/escala',
  },
  {
    title: 'Relatórios',
    icon: BarChart3,
    href: '/relatorios',
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-primary text-primary-foreground"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 bg-card border-r transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 p-6 border-b hover:bg-accent/50 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <div className="bg-primary p-2 rounded-lg">
              <BookMarked className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold">EBD</h2>
              <p className="text-xs text-muted-foreground">Escola Bíblica Dominical</p>
            </div>
          </Link>

          {/* Menu */}
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.title}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t space-y-3">
            <div className="flex justify-center">
              <ThemeToggle />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              © 2026 EBD Sistema
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
