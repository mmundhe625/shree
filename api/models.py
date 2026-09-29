from django.db import models
from typing import TYPE_CHECKING, ClassVar

if TYPE_CHECKING:
    from django.db.models.manager import Manager


class Client(models.Model):
    objects: ClassVar['Manager[Client]']
    DoesNotExist: ClassVar[type[Exception]]
    id = models.CharField(max_length=32, primary_key=True)
    name = models.CharField(max_length=160)
    company = models.CharField(max_length=160)
    phone = models.CharField(max_length=40, blank=True)
    location = models.CharField(max_length=160, blank=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=40, default='Active')
    last_activity = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Bill(models.Model):
    objects: ClassVar['Manager[Bill]']
    DoesNotExist: ClassVar[type[Exception]]
    invoice_no = models.CharField(max_length=32, primary_key=True)
    customer_name = models.CharField(max_length=160)
    customer_phone = models.CharField(max_length=40, blank=True)
    site_name = models.CharField(max_length=160, blank=True)
    site_address = models.CharField(max_length=255, blank=True)
    vehicle_no = models.CharField(max_length=80, blank=True)
    order_no = models.CharField(max_length=80, blank=True)
    invoice_date = models.CharField(max_length=32, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    previous_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    advance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_payable = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    approval_status = models.CharField(max_length=20, default='Pending')
    items = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)