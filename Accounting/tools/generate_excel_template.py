import xlwings as xw
import os

def create_accounting_software():
    # Create a new Excel workbook
    app = xw.App(visible=False)
    wb = app.books.add()

    # Rename the default sheet to Dashboard
    wb.sheets[0].name = 'Dashboard'

    # Add other sheets
    sheets = ['General Ledger', 'Accounts Payable', 'Accounts Receivable', 'Income Statement', 'Balance Sheet', 'Cash Flow']
    for sheet_name in sheets:
        wb.sheets.add(sheet_name)

    # Dashboard sheet - add some basic structure
    dash = wb.sheets['Dashboard']
    dash.range('A1').value = 'Accounting Dashboard'
    dash.range('A1').font.bold = True
    dash.range('A1').font.size = 16

    # Add placeholders for charts
    dash.range('A3').value = 'Key Metrics'
    dash.range('A5').value = 'Total Revenue:'
    dash.range('A6').value = 'Total Expenses:'
    dash.range('A7').value = 'Net Profit:'

    # General Ledger
    gl = wb.sheets['General Ledger']
    gl.range('A1').value = 'Date'
    gl.range('B1').value = 'Account'
    gl.range('C1').value = 'Debit'
    gl.range('D1').value = 'Credit'
    gl.range('E1').value = 'Description'
    # Make headers bold
    gl.range('A1:E1').font.bold = True

    # Add VBA code for auto calculation or something
    # Note: VBA code needs to be added manually in Excel due to trust settings
    # Example VBA code to add:
    # Sub AutoCalculateBalances()
    #     Dim ws As Worksheet
    #     Set ws = ThisWorkbook.Sheets("General Ledger")
    #     Dim lastRow As Long
    #     lastRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row
    #     ws.Range("F1").Value = "Balance"
    #     ws.Range("F2").Formula = "=C2 - D2"
    #     ws.Range("F2").AutoFill Destination:=ws.Range("F2:F" & lastRow)
    # End Sub

    # Skip VBA addition due to trust settings
    # wb.api.VBProject.VBComponents.Add(1).Name = "AccountingMacros"
    # wb.api.VBProject.VBComponents("AccountingMacros").CodeModule.AddFromString(vba_code)

    # Save as .xlsm
    wb.save(os.path.join(os.path.dirname(__file__), '..', 'accounting_software.xlsm'))
    wb.close()
    app.quit()

if __name__ == '__main__':
    create_accounting_software()