---
name: consolidate-day
description: "Consolida transações e dados financeiros do dia para o sistema Paritech. Executa automaticamente via cron para processar e consolidar movimentações diárias, calcular totais e gerar relatórios de fechamento do dia."
homepage: https://github.com/paritech/consolidate-day
metadata: { "openclaw": { "emoji": "📊", "requires": { "bins": ["python3"] }, "install": [] } }
---

# Consolidate Day Skill

Consolida dados financeiros e transações do dia para o sistema Paritech.

## When to Use

✅ **USE this skill when:**

- Execução de cron job diário de consolidação
- Solicitação explícita para consolidar dados do dia
- Fechamento diário de transações
- Geração de relatório de fechamento
- Processamento de movimentações pendentes

## When NOT to Use

❌ **DON'T use this skill when:**

- Consulta de dados históricos (use query-historical)
- Processamento em tempo real (use real-time-processor)
- Ajustes manuais de transações (use transaction-editor)

## Execution

### Consolidar Dia Atual

```bash
# Executa consolidação para o dia de hoje
python3 ~/openclaw/skills/consolidate-day/scripts/consolidate.py --date today
```

### Consolidar Data Específica

```bash
# Executa consolidação para uma data específica (YYYY-MM-DD)
python3 ~/openclaw/skills/consolidate-day/scripts/consolidate.py --date 2026-05-13
```

### Modo Verbose

```bash
# Executa com logs detalhados
python3 ~/openclaw/skills/consolidate-day/scripts/consolidate.py --date today --verbose
```

## Output

A skill gera:

1. **Resumo de Transações**: Total de créditos, débitos e saldo do dia
2. **Relatório Consolidado**: Arquivo JSON em `~/paritech/reports/YYYY-MM-DD_consolidated.json`
3. **Log de Execução**: Registro em `~/paritech/logs/consolidate-YYYY-MM-DD.log`
4. **Notificação**: Envio de resumo via WhatsApp (se configurado)

## Estrutura dos Dados

```json
{
  "date": "2026-05-13",
  "summary": {
    "total_credits": 0.0,
    "total_debits": 0.0,
    "net_balance": 0.0,
    "transaction_count": 0
  },
  "transactions": [],
  "consolidated_at": "2026-05-14T02:01:00Z"
}
```

## Cron Schedule

```cron
# Executa diariamente às 23:01 (11:01 PM)
1 23 * * * openclaw run consolidate-day
```

## Notes

- Requer diretório `~/paritech/data/` para leitura de transações
- Requer diretório `~/paritech/reports/` para escrita de relatórios
- Requer diretório `~/paritech/logs/` para logs de execução
- Processo idempotente: pode ser reexecutado sem duplicar dados
