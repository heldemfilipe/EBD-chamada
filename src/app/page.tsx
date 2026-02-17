"use client"

import Link from 'next/link'
import { BookOpen, Users, GraduationCap, Calendar, ClipboardCheck, CalendarDays, BarChart3, LayoutDashboard } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-lg">
                <BookOpen className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">EBD Sistema</h1>
                <p className="text-xs text-muted-foreground">Escola Bíblica Dominical</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/dashboard">
                <Button>
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Sistema de Gestão EBD
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Gerencie sua Escola Bíblica Dominical de forma simples e eficiente
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="text-lg px-8">
              Começar Agora
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">Funcionalidades</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <FeatureCard
            icon={<LayoutDashboard className="h-6 w-6" />}
            title="Dashboard"
            description="Visão geral com estatísticas e informações importantes"
            href="/dashboard"
            color="blue"
          />
          <FeatureCard
            icon={<Users className="h-6 w-6" />}
            title="Alunos"
            description="Cadastro completo de alunos com histórico de presenças"
            href="/alunos"
            color="green"
          />
          <FeatureCard
            icon={<GraduationCap className="h-6 w-6" />}
            title="Professores"
            description="Gestão de professores e suas especialidades"
            href="/professores"
            color="purple"
          />
          <FeatureCard
            icon={<Calendar className="h-6 w-6" />}
            title="Turmas"
            description="Organização de turmas por faixa etária"
            href="/turmas"
            color="orange"
          />
          <FeatureCard
            icon={<ClipboardCheck className="h-6 w-6" />}
            title="Chamada"
            description="Sistema de registro de presença e ausência"
            href="/chamada"
            color="red"
          />
          <FeatureCard
            icon={<CalendarDays className="h-6 w-6" />}
            title="Escala"
            description="Gerencie qual professor leciona em cada turma"
            href="/escala"
            color="cyan"
          />
          <FeatureCard
            icon={<BarChart3 className="h-6 w-6" />}
            title="Relatórios"
            description="Estatísticas e relatórios detalhados"
            href="/relatorios"
            color="pink"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2026 EBD Sistema de Gestão</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  href,
  color
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
  color: string
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white",
    green: "bg-green-500/10 text-green-500 group-hover:bg-green-500 group-hover:text-white",
    purple: "bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white",
    orange: "bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white",
    red: "bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white",
    cyan: "bg-cyan-500/10 text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white",
    pink: "bg-pink-500/10 text-pink-500 group-hover:bg-pink-500 group-hover:text-white",
  }

  return (
    <Link href={href} className="group">
      <Card className="h-full hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer">
        <CardHeader>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-2 transition-all ${colorClasses[color]}`}>
            {icon}
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  )
}
