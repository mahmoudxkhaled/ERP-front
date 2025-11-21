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

    }

    edit(entity: Entity): void {
        if (entity.id) {
            this.router.navigate(['/company-administration/entities', entity.id, 'edit']);
        }
    }

    toggle(entity: Entity): void {

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

