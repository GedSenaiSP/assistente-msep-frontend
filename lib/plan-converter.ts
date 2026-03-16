export interface PlanJson {
    plano_de_ensino: {
        informacoes_curso: {
            curso?: string
            turma?: string
            unidade_curricular?: string
            modulo?: string
            carga_horaria_total?: string
            objetivo?: string
            modalidade?: string
            professor?: string
            unidade?: string
            departamento_regional?: string
        }
        situacoes_aprendizagem: Array<{
            titulo?: string
            capacidades?: {
                tecnicas?: string[]
                basicas?: string[] // Algumas versoes podem usar 'basicas'
                socioemocionais?: string[]
            }
            conhecimentos?: Array<{
                topico?: string
                subtopicos?: Array<{
                    descricao?: string
                    subtopicos?: Array<{
                        descricao?: string
                    }>
                }>
            }>
            estrategia_aprendizagem?: {
                tipo?: string
                aulas_previstas?: string
                carga_horaria?: string
                detalhes?: {
                    titulo_sa?: string
                    contextualizacao?: string
                    desafio?: string
                    resultados_esperados?: string
                }
            }
            criterios_avaliacao?: {
                dicotomicos?: Array<{
                    capacidade?: string
                    criterios?: string[]
                }>
                graduais?: Array<{
                    capacidade?: string
                    niveis?: {
                        nivel_1?: string
                        nivel_2?: string
                        nivel_3?: string
                        nivel_4?: string
                    }
                }>
            }
            plano_de_aula?: Array<{
                horas_aulas_data?: string
                capacidades?: string
                conhecimentos?: string
                estrategias?: string
                recursos_ambientes?: string
                criterios_avaliacao?: string
                instrumento_avaliacao?: string
                referencias?: string
            }>
            perguntas_mediadoras?: string[]
        }>
    }
}

export function convertPlanJsonToMarkdown(planData: any): string {
    // Se for o objeto wrapper { plan_json: ... }
    const planJson = planData.plan_json ? planData : { plan_json: planData };
    const plano = planJson.plan_json?.plano_de_ensino || {};
    const info = plano.informacoes_curso || {};
    const sas = plano.situacoes_aprendizagem || [];

    const md: string[] = [];

    // Título principal
    const ucName = info.unidade_curricular || 'Unidade Curricular';
    md.push(`# Plano de Ensino - ${ucName}`);
    md.push("");

    // 1. Informações do Curso
    md.push("## 1. Informações do Curso");
    md.push("");
    md.push(`- **Curso**: ${info.curso || '-'}`);
    md.push(`- **Turma**: ${info.turma || '-'}`);
    md.push(`- **Unidade Curricular**: ${info.unidade_curricular || '-'}`);
    md.push(`- **Módulo**: ${info.modulo || '-'}`);
    md.push(`- **Carga Horária Total**: ${info.carga_horaria_total || '-'}`);
    md.push(`- **Objetivo**: ${info.objetivo || '-'}`);
    md.push(`- **Modalidade**: ${info.modalidade || '-'}`);
    md.push(`- **Professor**: ${info.professor || '-'}`);
    md.push(`- **Unidade**: ${info.unidade || '-'}`);
    md.push(`- **Departamento Regional**: ${info.departamento_regional || '-'}`);
    md.push("");

    // Situações de Aprendizagem
    sas.forEach((sa: any, index: number) => {
        const tituloSa = sa.titulo || `Situação de Aprendizagem ${index + 1}`;
        md.push(`## ${tituloSa}`);
        md.push("");

        // Capacidades
        const capacidades = sa.capacidades || {};
        const tecnicas = capacidades.tecnicas || capacidades.basicas || [];

        if (tecnicas.length > 0) {
            md.push("### Capacidades Técnicas");
            md.push("");
            tecnicas.forEach((cap: string) => md.push(`- ${cap}`));
            md.push("");
        }

        const socioemocionais = capacidades.socioemocionais || [];
        if (socioemocionais.length > 0) {
            md.push("### Capacidades Socioemocionais");
            md.push("");
            socioemocionais.forEach((cap: string) => md.push(`- ${cap}`));
            md.push("");
        }

        // Conhecimentos
        const conhecimentos = sa.conhecimentos || [];
        if (conhecimentos.length > 0) {
            md.push("### Conhecimentos");
            md.push("");
            conhecimentos.forEach((conhec: any) => {
                const topico = conhec.topico || '';
                md.push(`- **${topico}**`);
                const subtopicos = conhec.subtopicos || [];
                subtopicos.forEach((sub: any) => {
                    const desc = sub.descricao || '';
                    md.push(`  - ${desc}`);
                    const subSub = sub.subtopicos || [];
                    subSub.forEach((ss: any) => {
                        const ssDesc = ss.descricao || '';
                        md.push(`    - ${ssDesc}`);
                    });
                });
            });
            md.push("");
        }

        // Estratégia de Aprendizagem
        const estrategia = sa.estrategia_aprendizagem || {};
        if (Object.keys(estrategia).length > 0) {
            const tipo = estrategia.tipo || '-';
            md.push(`### Estratégia de Aprendizagem - ${tipo}`);
            md.push("");
            md.push(`- **Aulas Previstas**: ${estrategia.aulas_previstas || '-'}`);
            md.push(`- **Carga Horária**: ${estrategia.carga_horaria || '-'}`);
            md.push("");

            const detalhes = estrategia.detalhes || {};
            if (Object.keys(detalhes).length > 0) {
                if (detalhes.titulo_sa) {
                    md.push(`**Título**: ${detalhes.titulo_sa}`);
                    md.push("");
                }
                if (detalhes.contextualizacao) {
                    md.push("**Contextualização**:");
                    md.push("");
                    md.push(detalhes.contextualizacao);
                    md.push("");
                }
                if (detalhes.desafio) {
                    md.push("**Desafio**:");
                    md.push("");
                    md.push(detalhes.desafio);
                    md.push("");
                }
                if (detalhes.resultados_esperados) {
                    md.push("**Resultados Esperados**:");
                    md.push("");
                    md.push(detalhes.resultados_esperados);
                    md.push("");
                }
            }
        }

        // Critérios de Avaliação
        const criterios = sa.criterios_avaliacao || {};

        // Dicotômicos
        const dicotomicos = criterios.dicotomicos || [];
        if (dicotomicos.length > 0) {
            md.push("### Critérios de Avaliação - Dicotômicos");
            md.push("");
            md.push("| Capacidade | Critérios de Avaliação | Autoavaliação | Avaliação |");
            md.push("|------------|------------------------|---------------|-----------|");

            dicotomicos.forEach((dc: any) => {
                const cap = dc.capacidade || '-';
                const criteriosList = dc.criterios || [];
                criteriosList.forEach((crit: string, idx: number) => {
                    const capCell = idx === 0 ? cap : "";
                    md.push(`| ${capCell} | ${crit} | | |`);
                });
            });
            md.push("");
            md.push("*Legenda: S = Atingiu / N = Não Atingiu*");
            md.push("");
        }

        // Graduais
        const graduais = criterios.graduais || [];
        if (graduais.length > 0) {
            // Verificar se existem critérios de avaliação (campo 'criterios') em algum dos itens
            const hasCriterios = graduais.some((gr: any) => gr.criterios && gr.criterios.length > 0);

            md.push("### Critérios de Avaliação - Graduais");
            md.push("");

            if (hasCriterios) {
                md.push("| Capacidade | Critérios de Avaliação | Nível 1 | Nível 2 | Nível 3 | Nível 4 | Nível Alcançado |");
                md.push("|------------|------------------------|---------|---------|---------|---------|-----------------|");
            } else {
                md.push("| Capacidade | Nível 1 | Nível 2 | Nível 3 | Nível 4 | Nível Alcançado |");
                md.push("|------------|---------|---------|---------|---------|-----------------|");
            }

            graduais.forEach((gr: any) => {
                const cap = gr.capacidade || '-';
                const niveis = gr.niveis || {};
                const n1 = niveis.nivel_1 || '-';
                const n2 = niveis.nivel_2 || '-';
                const n3 = niveis.nivel_3 || '-';
                const n4 = niveis.nivel_4 || '-';

                if (hasCriterios) {
                    const criteriosList = gr.criterios || [];
                    const criteriosTexto = criteriosList.length > 0
                        ? criteriosList.map((c: string) => `&bull; ${c}`).join("<br/>")
                        : '-';
                    md.push(`| ${cap} | ${criteriosTexto} | ${n1} | ${n2} | ${n3} | ${n4} | |`);
                } else {
                    md.push(`| ${cap} | ${n1} | ${n2} | ${n3} | ${n4} | |`);
                }
            });
            md.push("");
            md.push("*Legenda dos Níveis:*");
            md.push("- *Nível 1: Desempenho autônomo* - apresenta desempenho esperado da competência com autonomia, sem intervenções do docente.");
            md.push("- *Nível 2: Desempenho parcialmente autônomo* - apresenta desempenho esperado da competência, com intervenções pontuais do docente.");
            md.push("- *Nível 3: Desempenho apoiado* - ainda não apresenta desempenho esperado da competência, exigindo intervenções constantes do docente.");
            md.push("- *Nível 4: Desempenho não satisfatório* - ainda não apresenta desempenho esperado da competência, mesmo com intervenções constantes do docente.");
            md.push("");
        }

        // Plano de Aula
        const planoAula = sa.plano_de_aula || [];
        if (planoAula.length > 0) {
            md.push("### Plano de Aula");
            md.push("");
            md.push("| Horas/Aulas/Data | Capacidades | Conhecimentos | Estratégias | Recursos/Ambientes | Critérios de Avaliação | Instrumento de Avaliação | Referências |");
            md.push("|------------------|-------------|---------------|-------------|--------------------|-----------------------|-------------------------|-------------|");

            planoAula.forEach((aula: any) => {
                const horas = (aula.horas_aulas_data || '-').replace(/\n/g, ' ');
                const caps = (aula.capacidades || '-').replace(/\n/g, ' / ');
                const conhec = (aula.conhecimentos || '-').replace(/\n/g, ' / ');
                const estrat = (aula.estrategias || '-').replace(/\n/g, ' / ');
                const recursos = (aula.recursos_ambientes || '-').replace(/\n/g, ' / ');
                const critAv = (aula.criterios_avaliacao || '-').replace(/\n/g, ' / ');
                const instr = (aula.instrumento_avaliacao || '-').replace(/\n/g, ' / ');
                const refs = (aula.referencias || '-').replace(/\n/g, ' / ');
                md.push(`| ${horas} | ${caps} | ${conhec} | ${estrat} | ${recursos} | ${critAv} | ${instr} | ${refs} |`);
            });
            md.push("");
        }

        // Perguntas Mediadoras
        const perguntas = sa.perguntas_mediadoras || [];
        if (perguntas.length > 0) {
            md.push("### Perguntas Mediadoras");
            md.push("");
            perguntas.forEach((pergunta: string, idx: number) => {
                md.push(`${idx + 1}. ${pergunta}`);
            });
            md.push("");
        }
    });

    return md.join("\n");
}
