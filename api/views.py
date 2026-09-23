# pyright: reportAttributeAccessIssue=false

import json
from decimal import Decimal, InvalidOperation
from typing import Any, cast

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from api.models import Bill, Client
from api.invoice_pdf import save_invoice_pdf

BillModel = cast(Any, Bill)
ClientModel = cast(Any, Client)


def _number(value, default=Decimal('0')):
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return default


def _json(request):
    try:
        return json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return {}


def _client_json(client):
    return {'id': client.id, 'name': client.name, 'company': client.company, 'phone': client.phone, 'location': client.location, 'balance': float(client.balance), 'status': client.status, 'lastActivity': client.last_activity, 'createdAt': client.created_at.isoformat()}


def _bill_json(bill):
    return {'invoiceNo': bill.invoice_no, 'customerName': bill.customer_name, 'customerPhone': bill.customer_phone, 'siteName': bill.site_name, 'siteAddress': bill.site_address, 'vehicleNo': bill.vehicle_no, 'orderNo': bill.order_no, 'invoiceDate': bill.invoice_date, 'subtotal': float(bill.subtotal), 'previousBalance': float(bill.previous_balance), 'advance': float(bill.advance), 'netPayable': float(bill.net_payable), 'items': bill.items, 'createdAt': bill.created_at.isoformat()}


def health(_request):
    return JsonResponse({'ok': True, 'message': 'Django backend is running'})


def dashboard(_request):
    return JsonResponse({'totalBills': BillModel.objects.count(), 'totalClients': ClientModel.objects.count(), 'pendingBills': BillModel.objects.filter(net_payable__gt=0).count()})


@csrf_exempt
def bills(request):
    if request.method == 'GET':
        return JsonResponse([_bill_json(bill) for bill in BillModel.objects.order_by('-created_at')], safe=False)
    if request.method == 'POST':
        data = _json(request)
        last = BillModel.objects.order_by('-created_at').first()
        last_number = int(last.invoice_no.removeprefix('INV-')) if last and last.invoice_no.startswith('INV-') else 0
        bill = BillModel.objects.create(invoice_no=f'INV-{last_number + 1:04d}', customer_name=data.get('customerName') or 'Walk-in Customer', customer_phone=data.get('customerPhone') or '', site_name=data.get('siteName') or 'Material Supply', site_address=data.get('siteAddress') or '', vehicle_no=data.get('vehicleNo') or '', order_no=data.get('orderNo') or '', invoice_date=data.get('invoiceDate') or '', subtotal=_number(data.get('subtotal')), previous_balance=_number(data.get('previousBalance')), advance=_number(data.get('advance')), net_payable=_number(data.get('netPayable', data.get('subtotal'))), items=data.get('items') or [])
        response = _bill_json(bill)
        response['pdfPath'] = save_invoice_pdf(bill)
        return JsonResponse(response, status=201)
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def clients(request):
    if request.method == 'GET':
        return JsonResponse([_client_json(client) for client in ClientModel.objects.order_by('-created_at')], safe=False)
    if request.method == 'POST':
        data = _json(request)
        client = ClientModel.objects.create(id=f'CL-{ClientModel.objects.count() + 1:03d}', name=data.get('name') or 'Unknown Client', company=data.get('company') or 'Unknown Company', phone=data.get('phone') or '', location=data.get('location') or '', balance=_number(data.get('balance')), status=data.get('status') or 'Active', last_activity=data.get('lastActivity') or 'Just now')
        return JsonResponse(_client_json(client), status=201)
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def pay_bill(request, invoice_no):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        bill = BillModel.objects.get(invoice_no=invoice_no)
    except BillModel.DoesNotExist:
        return JsonResponse({'error': 'Bill not found'}, status=404)
    bill.net_payable = Decimal('0')
    bill.save(update_fields=['net_payable'])
    return JsonResponse(_bill_json(bill))