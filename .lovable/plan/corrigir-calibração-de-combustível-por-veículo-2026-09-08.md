# Corrigir calibração de combustível por veículo

## Objetivo
Garantir que cada abastecimento pertença ao veículo ativo e que consumo, relatórios e calibração nunca misturem veículos, abastecimentos parciais ou combustíveis diferentes.

## Alterações
1. **Registro de abastecimento**
   - Incluir o veículo ativo ao criar e editar um abastecimento.
   - Impedir o envio quando nenhum veículo estiver selecionado, com mensagem clara em português.
   - Restringir o histórico da tela ao veículo ativo para manter os indicadores coerentes.

2. **Leituras e cálculos**
   - Filtrar a estimativa do tanque e o relatório pelo veículo ativo.
   - Ler também o tipo de combustível e a indicação de tanque cheio.
   - Calcular km/L somente entre dois abastecimentos completos do mesmo combustível.
   - Continuar somando abastecimentos parciais posteriores na estimativa de litros do tanque, sem usá-los para calcular km/L.

3. **Correção no Supabase**
   - Aplicar o SQL fornecido para associar registros órfãos quando o usuário possui um único veículo.
   - Corrigir a função de calibração para exigir o mesmo combustível nos dois extremos do trecho.
   - Recalcular calibrações existentes e criar os quatro índices solicitados.

4. **Validação**
   - Atualizar os testes atuais e adicionar cenários de abastecimento parcial e troca de combustível.
   - Executar os testes relacionados e verificar a compilação do aplicativo.

## Observação
Abastecimentos órfãos de usuários com mais de um veículo permanecerão sem associação, pois não existe informação segura para escolher o carro correto automaticamente.
