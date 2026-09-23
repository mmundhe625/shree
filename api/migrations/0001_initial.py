from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name='Bill',
            fields=[
                ('invoice_no', models.CharField(max_length=32, primary_key=True, serialize=False)),
                ('customer_name', models.CharField(max_length=160)),
                ('customer_phone', models.CharField(blank=True, max_length=40)),
                ('site_name', models.CharField(blank=True, max_length=160)),
                ('site_address', models.CharField(blank=True, max_length=255)),
                ('vehicle_no', models.CharField(blank=True, max_length=80)),
                ('order_no', models.CharField(blank=True, max_length=80)),
                ('invoice_date', models.CharField(blank=True, max_length=32)),
                ('subtotal', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('previous_balance', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('advance', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('net_payable', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('items', models.JSONField(default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name='Client',
            fields=[
                ('id', models.CharField(max_length=32, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=160)),
                ('company', models.CharField(max_length=160)),
                ('phone', models.CharField(blank=True, max_length=40)),
                ('location', models.CharField(blank=True, max_length=160)),
                ('balance', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('status', models.CharField(default='Active', max_length=40)),
                ('last_activity', models.CharField(blank=True, max_length=80)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]