import re
from pathlib import Path

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from api.models import Bill


def _date_folder(bill: Bill) -> str:
    value = bill.invoice_date or bill.created_at.date().isoformat()
    return value if re.fullmatch(r'\d{4}-\d{2}-\d{2}', value) else bill.created_at.date().isoformat()


def _money(value) -> str:
    return f'Rs. {value:,.2f}'


def save_invoice_pdf(bill: Bill) -> str:
    folder = Path(settings.BASE_DIR) / 'invoices' / _date_folder(bill)
    folder.mkdir(parents=True, exist_ok=True)
    file_path = folder / f'{bill.invoice_no}.pdf'
    styles = getSampleStyleSheet()

    document = SimpleDocTemplate(
        str(file_path),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )
    content = [
        Paragraph('INVOICE', styles['Title']),
        Paragraph(f'Invoice No: {bill.invoice_no}', styles['Normal']),
        Paragraph(f'Invoice Date: {bill.invoice_date or _date_folder(bill)}', styles['Normal']),
        Spacer(1, 8 * mm),
        Paragraph('<b>Bill To</b>', styles['Normal']),
        Paragraph(bill.customer_name, styles['Normal']),
    ]
    if bill.customer_phone:
        content.append(Paragraph(f'Phone: {bill.customer_phone}', styles['Normal']))
    if bill.site_name:
        content.append(Paragraph(f'Site: {bill.site_name}', styles['Normal']))
    if bill.site_address:
        content.append(Paragraph(f'Address: {bill.site_address}', styles['Normal']))
    content.append(Spacer(1, 8 * mm))

    rows = [['Description', 'Qty', 'Rate', 'Amount']]
    for item in bill.items or []:
        rows.append([
            item.get('description') or item.get('workType') or item.get('type') or 'Item',
            str(item.get('qty', '')),
            _money(item.get('rate', 0)),
            _money(item.get('amount', 0)),
        ])
    table = Table(rows, colWidths=[90 * mm, 20 * mm, 30 * mm, 35 * mm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#263b34')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#dddddd')),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    content.extend([
        table,
        Spacer(1, 8 * mm),
        Paragraph(f'<b>Subtotal: {_money(bill.subtotal)}</b>', styles['Normal']),
        Paragraph(f'Previous Balance: {_money(bill.previous_balance)}', styles['Normal']),
        Paragraph(f'Advance: {_money(bill.advance)}', styles['Normal']),
        Paragraph(f'<b>Net Payable: {_money(bill.net_payable)}</b>', styles['Normal']),
    ])
    document.build(content)
    return file_path.relative_to(settings.BASE_DIR).as_posix()