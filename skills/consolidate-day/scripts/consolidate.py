#!/usr/bin/env python3
"""
Paritech Consolidate Day - Script de consolidação diária de transações
"""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Diretórios base
BASE_DIR = Path.home() / "paritech"
DATA_DIR = BASE_DIR / "data"
REPORTS_DIR = BASE_DIR / "reports"
LOGS_DIR = BASE_DIR / "logs"


def ensure_directories():
    """Garante que os diretórios necessários existem."""
    for dir_path in [DATA_DIR, REPORTS_DIR, LOGS_DIR]:
        dir_path.mkdir(parents=True, exist_ok=True)


def parse_date(date_str: str) -> str:
    """Converte string de data para formato YYYY-MM-DD."""
    if date_str.lower() == "today":
        return datetime.now().strftime("%Y-%m-%d")
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return date_str
    except ValueError:
        raise ValueError(f"Formato de data inválido: {date_str}. Use 'today' ou YYYY-MM-DD")


def load_transactions(date_str: str) -> list:
    """Carrega transações do arquivo de dados para a data especificada."""
    data_file = DATA_DIR / f"{date_str}.json"
    
    if not data_file.exists():
        print(f"ℹ️ Nenhum arquivo de dados encontrado para {date_str}")
        return []
    
    try:
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('transactions', [])
    except (json.JSONDecodeError, IOError) as e:
        print(f"⚠️ Erro ao ler arquivo de dados: {e}")
        return []


def calculate_summary(transactions: list) -> dict:
    """Calcula o resumo das transações."""
    total_credits = 0.0
    total_debits = 0.0
    
    for tx in transactions:
        amount = float(tx.get('amount', 0))
        if amount > 0:
            total_credits += amount
        else:
            total_debits += abs(amount)
    
    return {
        "total_credits": round(total_credits, 2),
        "total_debits": round(total_debits, 2),
        "net_balance": round(total_credits - total_debits, 2),
        "transaction_count": len(transactions)
    }


def generate_report(date_str: str, transactions: list, summary: dict) -> dict:
    """Gera o relatório consolidado."""
    return {
        "date": date_str,
        "summary": summary,
        "transactions": transactions,
        "consolidated_at": datetime.utcnow().isoformat() + "Z"
    }


def save_report(date_str: str, report: dict):
    """Salva o relatório em arquivo JSON."""
    report_file = REPORTS_DIR / f"{date_str}_consolidated.json"
    
    try:
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print(f"✅ Relatório salvo: {report_file}")
        return True
    except IOError as e:
        print(f"❌ Erro ao salvar relatório: {e}")
        return False


def write_log(date_str: str, message: str, verbose: bool = False):
    """Escreve mensagem no log de execução."""
    log_file = LOGS_DIR / f"consolidate-{date_str}.log"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {message}\n"
    
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(log_entry)
    
    if verbose:
        print(log_entry.strip())


def print_summary(date_str: str, summary: dict, verbose: bool = False):
    """Exibe resumo da consolidação."""
    print(f"\n{'='*50}")
    print(f"📊 CONSOLIDAÇÃO DO DIA: {date_str}")
    print(f"{'='*50}")
    print(f"💰 Total de Créditos:  R$ {summary['total_credits']:,.2f}")
    print(f"💸 Total de Débitos:   R$ {summary['total_debits']:,.2f}")
    print(f"📈 Saldo Líquido:      R$ {summary['net_balance']:,.2f}")
    print(f"📝 Qtd. Transações:    {summary['transaction_count']}")
    print(f"{'='*50}\n")


def consolidate_day(date_str: str, verbose: bool = False) -> bool:
    """Executa a consolidação para o dia especificado."""
    ensure_directories()
    
    write_log(date_str, f"Iniciando consolidação para {date_str}", verbose)
    
    # Carrega transações
    transactions = load_transactions(date_str)
    write_log(date_str, f"Carregadas {len(transactions)} transações", verbose)
    
    # Calcula resumo
    summary = calculate_summary(transactions)
    
    # Gera relatório
    report = generate_report(date_str, transactions, summary)
    
    # Salva relatório
    if save_report(date_str, report):
        write_log(date_str, "Consolidação concluída com sucesso", verbose)
        print_summary(date_str, summary, verbose)
        return True
    else:
        write_log(date_str, "Falha na consolidação", verbose)
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Consolida transações do dia para o sistema Paritech"
    )
    parser.add_argument(
        "--date",
        default="today",
        help="Data para consolidação (today ou YYYY-MM-DD)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Modo verbose com logs detalhados"
    )
    
    args = parser.parse_args()
    
    try:
        date_str = parse_date(args.date)
        success = consolidate_day(date_str, args.verbose)
        sys.exit(0 if success else 1)
    except ValueError as e:
        print(f"❌ Erro: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
