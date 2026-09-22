import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Client } from './client';
import { ApiService } from '../shared/api.service';

describe('Client', () => {
  let component: Client;
  let fixture: ComponentFixture<Client>;
  let apiService: {
    get: jasmine.Spy;
    post: jasmine.Spy;
  };

  beforeEach(async () => {
    let storedClients: Array<Record<string, unknown>> = [];

    apiService = {
      get: jasmine.createSpy('get').and.callFake(async () => storedClients),
      post: jasmine.createSpy('post').and.callFake(async (_path: string, payload: Record<string, unknown>) => {
        storedClients = [{
          id: 'CL-001',
          name: payload.name,
          company: payload.company,
          phone: payload.phone,
          location: payload.location,
          balance: payload.balance,
          status: payload.status,
          lastActivity: payload.lastActivity,
        }];
        return storedClients[0];
      }),
    };

    await TestBed.configureTestingModule({
      imports: [Client],
      providers: [{ provide: ApiService, useValue: apiService }],
    }).compileComponents();

    fixture = TestBed.createComponent(Client);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('saves a manually entered client and clears the form', async () => {
    component.newClientName = 'Ravi Rao';
    component.newCompany = 'Ravi Infra';
    component.newPhone = '+91 90000 00000';
    component.newLocation = 'Pune';
    component.newBalance = 120000;

    await component.addClient();

    expect(apiService.post).toHaveBeenCalled();
    expect(component.clients).toHaveLength(1);
    expect(component.clients[0].name).toBe('Ravi Rao');
    expect(component.newClientName).toBe('');
    expect(component.statusMessage).toContain('successfully');
  });
});
