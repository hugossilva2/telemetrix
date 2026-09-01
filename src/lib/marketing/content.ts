/**
 * Conteúdo das páginas públicas de marketing (recursos e casos de uso).
 * Módulo puro: apenas textos e referências aos prints reais.
 */
import type { ScreenShotInfo } from "@/lib/demo/screens";
import { SCREENSHOT_BY_ID } from "@/lib/demo/screens";
import type { PlanId } from "@/lib/billing/plans";

export interface FeatureSection {
  id: string;
  title: string;
  lead: string;
  bullets: string[];
  screen: ScreenShotInfo;
}

export const FEATURE_SECTIONS: FeatureSection[] = [
  {
    id: "telemetria",
    title: "Telemetria ao vivo do motor",
    lead: "Velocidade, giro, temperatura e combustível chegam do próprio motor, em mostradores neon que reagem em tempo real.",
    bullets: [
      "Leitura por adaptador OBD-II ELM327 via Bluetooth ou por rastreador na nuvem",
      "Partida segura: aviso vermelho até o óleo circular após mais de 1 h parado",
      "Autonomia estimada com o consumo real da sua condução",
      "Indicação de abastecer e postos próximos quando o tanque chega perto da reserva",
    ],
    screen: SCREENSHOT_BY_ID.painel,
  },
  {
    id: "viagens",
    title: "Viagens registradas automaticamente",
    lead: "O app começa a gravar quando o motor liga e fecha o relatório quando desliga — sem apertar nada.",
    bullets: [
      "Rota no mapa colorida pela velocidade, com paradas e eventos",
      "Duração, velocidade média e máxima de cada trajeto",
      "Litros consumidos e custo estimado em reais por viagem",
      "Destino definido antes de sair, com ETA e alerta de desvio de rota",
    ],
    screen: SCREENSHOT_BY_ID.viagens,
  },
  {
    id: "relatorios",
    title: "Relatórios e Eco Score",
    lead: "Semana a semana você vê quanto rodou, quanto gastou e como pode economizar.",
    bullets: [
      "Km por dia, gasto total e custo por quilômetro",
      "Eco Score de 0 a 100 com frenagens bruscas, acelerações e faixa ideal de giro",
      "Tendências de consumo comparando semanas",
      "Coach de direção com dicas geradas por IA sobre suas viagens",
    ],
    screen: SCREENSHOT_BY_ID.relatorio,
  },
  {
    id: "consumo",
    title: "Abastecimentos, consumo e manutenção",
    lead: "Registre o abastecimento e o app calcula seu km/L real, o nível estimado do tanque e o que vence primeiro.",
    bullets: [
      "km/L real calculado entre tanques cheios",
      "Nível estimado do tanque mesmo sem sensor no OBD",
      "Alertas de óleo, filtros e rodízio de pneus por quilometragem",
      "Documentos com vencimento: CNH, CRLV e seguro, com anexo de arquivo ou foto",
    ],
    screen: SCREENSHOT_BY_ID.abastecer,
  },
  {
    id: "rastreio",
    title: "Rastreador e alertas de segurança",
    lead: "Modo rastreador focado em localização: onde o carro está agora, onde estacionou e o que aconteceu.",
    bullets: [
      "Distância e ETA entre você e o carro, usando o GPS do celular",
      "Último ponto estacionado sempre marcado no mapa",
      "Cerca virtual com automações ao entrar e sair dos seus lugares",
      "Observadores convidados recebem notificações da viagem em tempo real",
    ],
    screen: SCREENSHOT_BY_ID.rastreio,
  },
];

export interface UseCase {
  slug: "motorista" | "familia" | "frota" | "motorista-de-app" | "instrutor" | "autoescola";
  label: string;
  title: string;
  description: string;
  pain: string[];
  solution: { title: string; text: string }[];
  screens: ScreenShotInfo["id"][];
  plan: PlanId;
  planReason: string;
}

export const USE_CASES: Record<UseCase["slug"], UseCase> = {
  motorista: {
    slug: "motorista",
    label: "Motorista do dia a dia",
    title: "Para quem usa o carro todos os dias",
    description:
      "Saiba quanto custa cada trajeto, acompanhe o consumo real do seu carro e receba alertas de manutenção antes de virar prejuízo.",
    pain: [
      "Você abastece e não sabe quanto do tanque foi para trabalho, app ou lazer",
      "O consumo médio do computador de bordo nunca bate com o gasto do mês",
      "A troca de óleo passa do prazo porque ninguém lembra da quilometragem",
    ],
    solution: [
      {
        title: "Custo por viagem, não por mês",
        text: "Cada viagem sai com litros e reais estimados, usando o preço do seu último abastecimento.",
      },
      {
        title: "Consumo real, medido",
        text: "O km/L é calculado entre tanques cheios, então você vê o número verdadeiro do seu carro.",
      },
      {
        title: "Manutenção que avisa antes",
        text: "Cadastre a última troca e o app desconta a quilometragem rodada, alertando antes do vencimento.",
      },
    ],
    screens: ["painel", "viagens", "abastecer"],
    plan: "pro",
    planReason: "Histórico completo, relatórios semanais e coach de direção com IA.",
  },
  familia: {
    slug: "familia",
    label: "Família",
    title: "Para acompanhar quem você ama na estrada",
    description:
      "Compartilhe a viagem com a família, receba avisos de chegada e saiba onde o carro está estacionado sem ligar para perguntar.",
    pain: [
      'Ligações de "já chegou?" no meio da viagem',
      "Ninguém sabe onde o carro ficou estacionado no shopping ou no aeroporto",
      "Viagens longas sem controle de descanso e de combustível",
    ],
    solution: [
      {
        title: "Observadores convidados",
        text: "Você escolhe quem acompanha o trajeto ao vivo e recebe notificações de saída e chegada.",
      },
      {
        title: "Onde o carro parou",
        text: "O último ponto estacionado fica marcado no mapa, com distância e ETA até ele.",
      },
      {
        title: "Modo viagem longa",
        text: "Autonomia real, pontos de parada e avisos de fadiga a cada duas horas de direção.",
      },
    ],
    screens: ["rastreio", "painel", "relatorio"],
    plan: "pro",
    planReason: "Compartilhamento com observadores, rotinas e histórico completo.",
  },
  frota: {
    slug: "frota",
    label: "Pequena frota",
    title: "Para equipes com poucos veículos",
    description:
      "Compare motoristas, controle custos por veículo e mantenha documentos e manutenções em dia sem planilha.",
    pain: [
      "Custo por veículo espalhado em recibos e planilhas",
      "Ninguém sabe qual motorista dirige de forma mais econômica",
      "Documentos de vários carros vencendo em datas diferentes",
    ],
    solution: [
      {
        title: "Motoristas com pontuação",
        text: "Perfil com foto, Eco Score, direção segura e ranking da equipe por período.",
      },
      {
        title: "Custos por veículo",
        text: "Abastecimentos, despesas e custo por quilômetro separados para cada carro da frota.",
      },
      {
        title: "Documentos e manutenções centralizados",
        text: "Vencimentos de CRLV, seguro e revisões de todos os veículos em uma lista só.",
      },
    ],
    screens: ["relatorio", "viagens", "rastreio"],
    plan: "frota",
    planReason: "Veículos ilimitados, motoristas com ranking e despesas por veículo.",
  },
  "motorista-de-app": {
    slug: "motorista-de-app",
    label: "Motorista de app",
    title: "Para quem roda de Uber, 99 e similares",
    description:
      "Saiba quanto sobra de verdade no fim da semana: ganhos, combustível e manutenção do carro lado a lado, na palma da mão.",
    pain: [
      "O valor que o app mostra não é o que sobra depois do combustível",
      "Trocas de óleo e pneus chegam mais rápido com rodagem alta e pegam de surpresa",
      "Difícil saber se vale mais a pena rodar de manhã ou à noite",
    ],
    solution: [
      {
        title: "Lucro por km e por hora",
        text: "Lance corridas e turnos em dois toques; o app cruza com o combustível real gasto e mostra quanto sobrou.",
      },
      {
        title: "Manutenção para rodagem alta",
        text: "Intervalos de óleo, pneus e freios ajustados para quem roda 300 km por dia, com alerta antes de vencer.",
      },
      {
        title: "Semana no formato do app",
        text: "Relatório de segunda a domingo, igual ao extrato da plataforma, com custo por corrida.",
      },
    ],
    screens: ["relatorio", "abastecer", "viagens"],
    plan: "pro",
    planReason: "Histórico completo, relatórios semanais e coach de direção para economizar combustível.",
  },
  instrutor: {
    slug: "instrutor",
    label: "Instrutor autônomo",
    title: "Para o instrutor que dá aulas com o próprio carro",
    description:
      "Alunos, agenda e cada aula registrada como trajeto avaliado — freadas, giro do motor e quilometragem — sem planilha.",
    pain: [
      "Aulas anotadas no papel ou no WhatsApp, sem histórico por aluno",
      "Combustível e desgaste do carro sem relação com as aulas dadas",
      "Aluno pergunta como está indo e você não tem dado para mostrar",
    ],
    solution: [
      {
        title: "Aula vira trajeto avaliado",
        text: "Ao encerrar a aula, o percurso gravado pelo carro vira o registro com Eco Score e eventos de direção.",
      },
      {
        title: "Alunos e evolução",
        text: "Cadastro do aluno, aulas contratadas x realizadas, checklist (baliza, embreagem, sinalização) e observações.",
      },
      {
        title: "Cobrança por aula",
        text: "Valor por aula ou pacote, com pago/pendente por aluno e custo do carro por aula.",
      },
    ],
    screens: ["viagens", "painel", "relatorio"],
    plan: "pro",
    planReason: "Histórico completo, relatórios e compartilhamento com alunos.",
  },
  autoescola: {
    slug: "autoescola",
    label: "Autoescola",
    title: "Para autoescolas com vários carros e instrutores",
    description:
      "Instrutores com login próprio, agenda geral por carro e a visão do dono: aulas, quilometragem e combustível por veículo.",
    pain: [
      "Não se sabe qual carro está com qual instrutor a cada hora",
      "Combustível por carro só aparece no fim do mês, sem ligação com as aulas",
      "Documentos e revisões de vários carros vencendo em datas diferentes",
    ],
    solution: [
      {
        title: "Equipe com login",
        text: "Convide instrutores; cada um registra suas aulas no celular e vê apenas o que é dele.",
      },
      {
        title: "Agenda geral sem conflito",
        text: "Quem está com qual carro, alunos por instrutor e avisos de horário sobreposto.",
      },
      {
        title: "Visão do dono",
        text: "Aulas por instrutor, km e combustível por carro, custo por aula e ranking de direção da equipe.",
      },
    ],
    screens: ["rastreio", "relatorio", "viagens"],
    plan: "frota",
    planReason: "Veículos ilimitados, equipe com ranking e despesas por veículo.",
  },
};

export const USE_CASE_LIST = Object.values(USE_CASES);
