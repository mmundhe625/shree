import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Client } from './client/client';
import { Bills } from './bills/bills';
import { Dashboard } from './dashboard/dashboard';

export const routes: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: 'home', component: Home },
    { path: 'dashboard', component: Dashboard },
    { path: 'client', component: Client },
    {path:'bills',component:Bills}
];
