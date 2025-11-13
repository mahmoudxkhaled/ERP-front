import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { EntitiesService } from '../../services/entities.service';

interface Entity {
    id?: string;
    name: string;
    countryCode: string;
    active: boolean;
    timezone?: string;
    taxId?: string;
}

@Component({
    selector: 'app-entities-list',
    templateUrl: './entities-list.component.html',
    styleUrls: ['./entities-list.component.scss'],
    providers: [MessageService]
})
export class EntitiesListComponent implements OnInit, OnDestroy {
    entities: Entity[] = [];
    loading = false;
    tableLoadingSpinner = false;
    private subscriptions: Subscription[] = [];

    constructor(
        private entitiesService: EntitiesService,
        private router: Router,
        private messageService: MessageService
    ) { }

    ngOnInit(): void {
        this.loadEntities();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    loadEntities(): void {
        this.loading = true;
        this.tableLoadingSpinner = true;
        const sub = this.entitiesService.list().subscribe({
            next: (response: any) => {
                if (response?.success === true) {
                    this.entities = response.data || [];
                } else {
                    const errorMsg = response?.message || 'Failed to load entities';
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: errorMsg
                    });
                }
                this.loading = false;
                this.tableLoadingSpinner = false;
            },
            error: (error: any) => {
                const errorMsg = error?.message || 'Error loading entities';
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: errorMsg
                });
                this.loading = false;
                this.tableLoadingSpinner = false;
            }
        });
        this.subscriptions.push(sub);
    }

    edit(entity: Entity): void {
        if (entity.id) {
            this.router.navigate(['/company-administration/entities', entity.id, 'edit']);
        }
    }

    toggle(entity: Entity): void {
        if (!entity.id) return;
        const active = !entity.active;
        this.loading = true;
        const sub = this.entitiesService.toggleActive(entity.id, active).subscribe({
            next: (response: any) => {
                if (response?.success === true) {
                    entity.active = active;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: active ? 'Entity activated' : 'Entity deactivated'
                    });
                } else {
                    const errorMsg = response?.message || 'Failed to update entity status';
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: errorMsg
                    });
                }
                this.loading = false;
            },
            error: (error: any) => {
                const errorMsg = error?.message || 'Error updating entity status';
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: errorMsg
                });
                this.loading = false;
            }
        });
        this.subscriptions.push(sub);
    }

    assignAdmin(entity: Entity): void {
        if (entity.id) {
            this.router.navigate(['/company-administration/entities', entity.id, 'assign-admin']);
        }
    }

    navigateToNew(): void {
        this.router.navigate(['/company-administration/entities/new']);
    }

    getStatusSeverity(status: boolean): string {
        return status ? 'success' : 'danger';
    }

    getStatusLabel(status: boolean): string {
        return status ? 'Active' : 'Inactive';
    }
}

