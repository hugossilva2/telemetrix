# Telemetrix

Atue como um Desenvolvedor Full-Stack React Expert (Vite + TypeScript + Tailwind CSS + shadcn/ui). Sua tarefa é criar um PWA (Progressive Web App) mobile-first para gestão veicular em tempo real, consumindo dados IoT da plataforma Flespi.

### 1. ARQUITETURA E INTEGRAÇÃO DE DADOS (FLESPI)
O app deve se conectar ao Flespi via MQTT sobre WebSockets para receber telemetria em tempo real.
- **Broker MQTT:** `wss://mqtt.flespi.io:443`
- **Username (Token):** `eBxqUHJInEavElozzzLBtLEl7gWT3LztGZMHK1tcYYQK1h4z0wCl8JWpXT3tXk0o`
- **Tópico de Inscrição:** `flespi/message/gw/devices/8634775/+`
- Crie um custom hook `useFlespiMqtt` usando a biblioteca `mqtt` (ou equivalente nativo do browser) para gerenciar a conexão e escutar as mensagens.
- O payload JSON recebido do Teltonika FMC003 contém as seguintes chaves reais que devem ser mapeadas no estado (state) da aplicação:
  - `position.latitude` e `position.longitude` (Coordenadas)
  - `position.speed` (Velocidade em km/h)
  - `engine.ignition.status` (Booleano: true = Ligado, false = Desligado)
  - `vehicle.mileage` (Odômetro total)
  - `battery.voltage` (Tensão da bateria interna)
  - `can.fuel.level` (Nível de combustível - tratar como opcional/null caso o veículo esteja desligado)
  - `can.engine.rpm` (RPM do motor - tratar como opcional)

### 2. ESTRUTURA DO BACKEND (SUPABASE)
O app utilizará o Supabase para persistência de dados. Gere os componentes assumindo que as seguintes tabelas existirão no banco PostgreSQL:
- `vehicles`: `id`, `name`, `plate`, `current_mileage`.
- `fuel_logs`: `id`, `date`, `price_per_liter`, `liters_filled`, `total_cost`, `mileage_at_fill`.
- `trips`: `id`, `start_time`, `end_time`, `start_lat`, `start_lng`, `end_lat`, `end_lng`, `distance_km`.
- Crie um arquivo de serviço (ex: `supabaseClient.ts`) com o setup padrão usando `@supabase/supabase-js`.

### 3. INTERFACE DE USUÁRIO (UI/UX)
O design deve ser Dark Mode por padrão, minimalista e focado na usabilidade com uma mão. Use ícones do `lucide-react`.

**Estrutura de Navegação (Bottom Bar):**
- 🚗 Dashboard
- 🗺️ Mapa
- ⛽ Abastecimento
- ⚙️ Ajustes

**Página 1: Dashboard (Visão Real-time)**
- Cabeçalho indicando Status do Veículo ("Ligado" com badge verde ou "Desligado" com badge cinza, baseado em `engine.ignition.status`).
- Um grid de Cards exibindo a telemetria ao vivo: Velocidade Atual, Odômetro (formatado com separador de milhar), Nível de Combustível (com barra de progresso) e RPM.

**Página 2: Mapa**
- Integre a biblioteca `leaflet` e `react-leaflet`.
- O mapa deve centralizar automaticamente nas variáveis `position.latitude` e `position.longitude` recebidas via MQTT.
- Adicione um marcador customizado para representar o carro.

**Página 3: Gestão de Abastecimento**
- Um formulário limpo para inserir dados do posto: Preço do Litro (R$), Valor Total Pago (R$).
- O campo "Odômetro Atual" deve vir preenchido automaticamente com o valor de `vehicle.mileage` do MQTT.
- Um botão grande de "Salvar Abastecimento" que dispara uma inserção (mockada por enquanto) na tabela `fuel_logs` do Supabase.
- Abaixo do formulário, exiba um gráfico de barras simples (usando `recharts`) mostrando o "Histórico de Custo (R$/km)".

**Página 4: Configurações**
- Formulário para editar dados do perfil do carro.
- Toggle buttons para "Alertar motor ligado" e "Alertar bateria baixa".

**Regras de Código:**
Crie o projeto completo em um único fluxo, separando os componentes em arquivos lógicos. Priorize a robustez do hook de conexão MQTT, pois ele é o coração da aplicação. Trate os erros de desconexão do WebSocket com tentativas de reconexão automática.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://telemetrix.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7c374bcd-c1f1-44e3-b253-189fe82df77d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
