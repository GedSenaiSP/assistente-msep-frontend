"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useTheme } from "next-themes"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Brain, CheckCircle, FileText, MessageSquare } from "lucide-react"

export default function LandingPage() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Necessário para evitar erro de hidratação
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section - Sem imagem */}
      <section className="relative bg-gradient-msep text-white py-16 md:py-20">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-[3.2rem] font-bold mb-4 text-white leading-tight">
              Assistente Virtual da
              <br />
              Metodologia SENAI de Educação
              <br />
              Profissional
            </h1>
            <p className="text-xl mb-8 text-white/90">
              Crie planos de ensino personalizados com inteligência artificial generativa baseada na Metodologia SENAI
              de Educação Profissional.
            </p>
            <Link href="/app">
              <Button className="bg-msep-orange hover:bg-msep-orange/90 text-lg px-6 py-3 rounded-md">
                Começar Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 msep-blue-gradient-text">Recursos Principais</h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
              O Assistente Virtual da MSEP oferece ferramentas poderosas para docentes criarem planos de ensino
              eficientes e tirarem duvidas sobre a prática pedagógica.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Brain className="h-10 w-10 text-msep-blue dark:text-msep-blue-light" />}
              title="IA Especializada"
              description="Inteligência artificial treinada especificamente na Metodologia SENAI de Educação Profissional."
            />
            <FeatureCard
              icon={<FileText className="h-10 w-10 text-msep-blue dark:text-msep-blue-light" />}
              title="Planos Personalizados"
              description="Crie planos de ensino adaptados às necessidades específicas dos seus cursos e alunos."
            />
            <FeatureCard
              icon={<MessageSquare className="h-10 w-10 text-msep-blue dark:text-msep-blue-light" />}
              title="Assistente Interativo"
              description="Converse com o assistente para refinar e melhorar seus planos de ensino e tirar dúvidas sobre a metodologia."
            />
          </div>
        </div>
      </section>

      {/* Methodology Section - Sem imagem */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 msep-orange-gradient-text text-center">
              Metodologia SENAI de Educação Profissional
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 text-center">
              A Metodologia SENAI de Educação Profissional (MSEP) é uma abordagem pedagógica inovadora que prepara
              profissionais para os desafios do mercado de trabalho moderno.
            </p>
            <div className="mt-8">
              <ul className="space-y-3 max-w-xl mx-auto">
                {[
                  "Formação baseada em competências",
                  "Integração entre teoria e prática",
                  "Situações de aprendizagem contextualizadas",
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-msep-orange mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 bg-gradient-msep text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-white">Comece a Usar Agora</h2>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Transforme sua experiência de ensino com o Assistente Virtual da MSEP.
          </p>
          <Link href="/app">
            <Button className="bg-white text-msep-blue hover:bg-gray-100 text-lg px-8 py-3 rounded-md font-semibold">
              Acessar o Assistente
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-8 md:mb-0 flex items-center">
              {mounted && (
                <div className="h-8 w-auto">
                  <Image src="/senai-sp-logo.png" alt="SENAI SP Logo" width={124} height={32} className="h-8 w-auto" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
              {/* <div>
                <h3 className="text-lg font-semibold mb-4 text-white">Recursos</h3>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="https://itinerario.senai.br/saml/login?idp=iam.senai.br"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      Sistema de Itinerários Nacional
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://recursosdidaticos.senai.br/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      Recursos Didáticos
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://estantedelivros.senai.br/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      Estante de Livros
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.youtube.com/channel/UC4fCiXPjL_8efQYxyD9GgDg"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      Senai Play
                    </a>
                  </li>
                </ul>
              </div> */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-white">Suporte</h3>
                <ul className="space-y-2">
                  {/* <li>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors">
                      Ajuda
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://chat.whatsapp.com/FCwXyWaeFgbBX3ifJ7NNRE"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      Comunidade
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.senai.portaldaindustria.com.br/web/senai/institucional/metodologia"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      Metodologia
                    </a>
                  </li> */}
                  <li>
                    <a
                      href="https://www.sp.senai.br/termos-de-uso-e-politica-de-privacidade"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      Política de Privacidade
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.sp.senai.br/termos-de-uso-e-politica-de-privacidade"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      Termos de Uso
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <p className="text-gray-400 text-center md:text-left">&copy; 2025 Serviço Nacional de Aprendizagem Industrial. Todos os direitos reservados.</p>
            <p className="text-gray-400 text-center md:text-right">Serviço educacional em fase de testes.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="border border-gray-200 dark:border-gray-700 h-full transition-all duration-300 hover:shadow-lg hover:border-msep-blue dark:hover:border-msep-blue-light">
      <CardContent className="p-6 flex flex-col items-center text-center">
        <div className="mb-4 p-3 rounded-full bg-red-50 dark:bg-red-900/20">{icon}</div>
        <h3 className="text-xl font-semibold mb-2 text-msep-blue dark:text-msep-blue-light">{title}</h3>
        <p className="text-gray-700 dark:text-gray-300">{description}</p>
      </CardContent>
    </Card>
  )
}
