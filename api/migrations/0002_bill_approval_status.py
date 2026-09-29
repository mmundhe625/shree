from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('api', '0001_initial')]

    operations = [
        migrations.AddField(
            model_name='bill',
            name='approval_status',
            field=models.CharField(default='Approved', max_length=20),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='bill',
            name='approval_status',
            field=models.CharField(default='Pending', max_length=20),
        ),
    ]