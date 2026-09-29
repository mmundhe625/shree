from django.urls import path
from api.views import approve_bill, bills, clients, dashboard, health, pay_bill

urlpatterns = [path('health', health), path('dashboard', dashboard), path('bills', bills), path('bills/<str:invoice_no>/pay', pay_bill), path('bills/<str:invoice_no>/approve', approve_bill), path('clients', clients)]