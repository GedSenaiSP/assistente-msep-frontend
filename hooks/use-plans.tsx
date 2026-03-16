"use client"

import { useState } from "react"

// Interface para situações de aprendizagem
export interface LearningActivity {
  id: string
  type: string
  description: string
  context?: string
  challenge?: string
  expectedResults?: string
}

// Interface para planos de ensino
export interface TeachingPlan {
  id: string
  title: string
  unit: string
  duration: string
  objectives: string[]
  learningActivities: LearningActivity[]
  evaluation: string
  resources: string[]
  createdAt: Date
  lastModified: Date
  course?: string
  className?: string
  module?: string
  unitHours?: string
  strategyHours?: string
  classesCount?: string
  unitObjective?: string
  teachingMode?: string
  teacher?: string
  school?: string
  capacities?: any[]
  knowledge?: any[]
  evaluationCriteria?: any[]
  classPlans?: any[]
  completeStrategies?: any[]
}

export function usePlans() {
  // Estados básicos
  const [activePlan, setActivePlan] = useState<TeachingPlan | null>(null)

  // Informações do professor e escola
  const [teacherName, setTeacherName] = useState("")
  const [school, setSchool] = useState("")

  // Informações do curso
  const [courseName, setCourseName] = useState("")
  const [unit, setUnit] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Capacidades
  const [technicalCapabilities, setTechnicalCapabilities] = useState<string[]>([])
  const [socialCapabilities, setSocialCapabilities] = useState<string[]>([])

  // Tipo de aprendizagem e cronograma
  const [learningType, setLearningType] = useState("")
  const [schedule, setSchedule] = useState<any[]>([])
  const [learningActivities, setLearningActivities] = useState<LearningActivity[]>([])

  // Arquivos
  const [files, setFiles] = useState<File[]>([])
  const [processedFiles, setProcessedFiles] = useState<string[]>([])

  // Funções
  const handleFileUpload = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles])
  }

  const handleProcessFiles = () => {
    // Simulate processing files
    const newProcessedFiles = files.map((file) => file.name)
    setProcessedFiles(newProcessedFiles)
  }

  // Função para gerar um plano de ensino
  const generatePlan = (prompt: string) => {
    // Simulação de geração de plano com estrutura alinhada ao "Criar Plano de Ensino Manual"
    setActivePlan({
      id: `plan-${Date.now()}`,
      title: prompt || "Plano de Ensino",
      unit: unit || prompt || "Unidade Curricular",
      duration: "60 horas",
      createdAt: new Date(),
      lastModified: new Date(),
      // Cabeçalho
      course: courseName || prompt || "Desenvolvimento Web",
      className: "Turma A",
      module: "Módulo 1",
      unitHours: "60 horas",
      strategyHours: "20 horas",
      classesCount: "10 aulas",
      unitObjective: "Desenvolver competências para criação de aplicações web responsivas e acessíveis.",
      teachingMode: "Presencial",
      teacher: teacherName || "Professor",
      school: school || "SENAI",

      // Capacidades
      objectives: [
        "Desenvolver aplicações web responsivas",
        "Implementar APIs RESTful",
        "Utilizar frameworks modernos de frontend",
      ],
      capacities: [
        {
          id: "cap-1",
          type: "technical",
          description: "Desenvolver interfaces de usuário com HTML, CSS e JavaScript",
        },
        {
          id: "cap-2",
          type: "technical",
          description: "Implementar requisições assíncronas e consumo de APIs",
        },
        {
          id: "cap-3",
          type: "socioemotional",
          description: "Trabalhar em equipe de forma colaborativa",
        },
      ],

      // Conhecimentos
      knowledge: [
        {
          id: "know-1",
          level: 1,
          description: "Fundamentos de HTML5",
        },
        {
          id: "know-2",
          level: 1,
          description: "CSS3 e responsividade",
        },
        {
          id: "know-3",
          level: 2,
          description: "JavaScript ES6+",
          parentId: "know-1",
        },
      ],

      // Estratégias de Aprendizagem
      learningActivities:
        learningActivities.length > 0
          ? learningActivities
          : [
              {
                id: "la1",
                type: "Projeto Integrador",
                description: "Desenvolvimento de um e-commerce completo com frontend e backend",
                context: "Empresa fictícia precisa de uma plataforma de vendas online",
                challenge: "Criar uma aplicação web responsiva com funcionalidades de e-commerce",
                expectedResults: "Sistema funcional com catálogo de produtos, carrinho e checkout",
              },
              {
                id: "la2",
                type: "Situação-Problema",
                description: "Otimização de performance em aplicações web existentes",
                context: "Site com problemas de carregamento e experiência do usuário",
                challenge: "Identificar e corrigir problemas de performance",
                expectedResults: "Redução do tempo de carregamento e melhoria na experiência do usuário",
              },
            ],

      // Avaliação
      evaluation: "Avaliação contínua baseada em entregas incrementais do projeto",
      evaluationCriteria: [
        {
          id: "eval-1",
          capacityId: "cap-1",
          description: "Implementação correta de interfaces responsivas",
        },
        {
          id: "eval-2",
          capacityId: "cap-2",
          description: "Integração funcional com APIs externas",
        },
      ],

      // Planos de Aula
      classPlans: [
        {
          id: "class-1",
          dateTime: new Date(2025, 3, 15, 19, 0).toISOString(),
          capacityIds: ["cap-1"],
          knowledgeIds: ["know-1"],
          strategies: "Aula expositiva e exercícios práticos",
          resources: "Computadores, projetor, ambiente de desenvolvimento",
          evaluationCriterionId: "eval-1",
          evaluationInstrument: "Exercício prático",
          references: "MDN Web Docs, W3Schools",
        },
        {
          id: "class-2",
          dateTime: new Date(2025, 3, 17, 19, 0).toISOString(),
          capacityIds: ["cap-2"],
          knowledgeIds: ["know-3"],
          strategies: "Desenvolvimento de projeto em grupo",
          resources: "Computadores, APIs de teste",
          evaluationCriterionId: "eval-2",
          evaluationInstrument: "Projeto prático",
          references: "JavaScript.info, MDN Web Docs",
        },
      ],

      // Recursos
      resources: [
        "Computadores com acesso à internet",
        "Ambiente de desenvolvimento configurado",
        "Documentação técnica e tutoriais",
        "APIs de teste para integração",
      ],

      // Estratégias completas
      completeStrategies: [
        {
          id: "complete-1",
          title: "Desenvolvimento de E-commerce",
          capacities: [
            {
              id: "cap-1",
              type: "technical",
              description: "Desenvolver interfaces de usuário com HTML, CSS e JavaScript",
            },
            {
              id: "cap-2",
              type: "technical",
              description: "Implementar requisições assíncronas e consumo de APIs",
            },
          ],
          knowledge: [
            {
              id: "know-1",
              level: 1,
              description: "Fundamentos de HTML5",
            },
            {
              id: "know-3",
              level: 2,
              description: "JavaScript ES6+",
              parentId: "know-1",
            },
          ],
          learningStrategy: {
            id: "la1",
            type: "Projeto Integrador",
            context: "Empresa fictícia precisa de uma plataforma de vendas online",
            challenge: "Criar uma aplicação web responsiva com funcionalidades de e-commerce",
            expectedResults: "Sistema funcional com catálogo de produtos, carrinho e checkout",
          },
          evaluationCriteria: [
            {
              id: "eval-1",
              capacityId: "cap-1",
              description: "Implementação correta de interfaces responsivas",
            },
            {
              id: "eval-2",
              capacityId: "cap-2",
              description: "Implementação funcional com APIs externas",
            },
          ],
          createdAt: new Date(),
        },
      ],
    })
  }

  return {
    // Estados
    activePlan,
    setActivePlan,
    teacherName,
    setTeacherName,
    school,
    setSchool,
    courseName,
    setCourseName,
    unit,
    setUnit,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    technicalCapabilities,
    setTechnicalCapabilities,
    socialCapabilities,
    setSocialCapabilities,
    learningType,
    setLearningType,
    schedule,
    setSchedule,
    learningActivities,
    setLearningActivities,
    files,
    setFiles,
    processedFiles,
    setProcessedFiles,

    // Funções
    handleFileUpload,
    handleProcessFiles,
    generatePlan,
  }
}
