# Accounting Automation Project

This project uses the WAT (Workflows, Agents, Tools) framework to build and maintain accounting software in Excel.

## Project Structure

- `.tmp/`: Temporary files for processing
- `tools/`: Python scripts for deterministic execution
- `workflows/`: Markdown SOPs defining processes
- `.env`: Environment variables and API keys
- `accounting_software.xlsm`: The main Excel accounting software

## Getting Started

1. Activate the virtual environment: `.\venv\Scripts\Activate.ps1`
2. Run tools as needed from the `tools/` directory
3. Follow workflows in `workflows/` for specific tasks

## Accounting Software Features

- Dashboard with key metrics
- General Ledger
- Accounts Payable/Receivable
- Income Statement, Balance Sheet, Cash Flow sheets
- VBA macros for automation (add manually in Excel)

## Workflow

See `workflows/build_accounting_software.md` for the process to build and enhance the software.