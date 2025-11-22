import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { EntitiesService } from '../../services/entities.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { Entity, EntityBackend, EntitiesListResponse } from '../../models/entities.model';
import { IAccountSettings } from 'src/app/core/models/IAccountStatusResponse';

type EntityActionContext = 'list' | 'activate' | 'deactivate' | 'delete';

@Component({
    selector: 'app-entities-list',
    templateUrl: './entities-list.component.html',
    styleUrls: ['./entities-list.component.scss']
})
export class EntitiesListComponent implements OnInit, OnDestroy {
    entities: Entity[] = [];
    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;
    private subscriptions: Subscription[] = [];
    activationControls: Record<string, FormControl<boolean>> = {};
    menuItems: MenuItem[] = [];
    currentEntity?: Entity;
    accountSettings: IAccountSettings;
    activationEntityDialog: boolean = false;
    currentEntityForActivation?: Entity;
    deleteEntityDialog: boolean = false;
    currentEntityForDelete?: Entity;
    constructor(
        private entitiesService: EntitiesService,
        private router: Router,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.isLoading$ = this.entitiesService.isLoadingSubject.asObservable();
    }

    ngOnInit(): void {
        this.configureMenuItems();
        this.loadEntities();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadEntities(forceReload: boolean = false): void {
        if (this.entitiesService.isLoadingSubject.value && !forceReload) {
            return;
        }

        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        const isRegional = this.accountSettings?.Language !== 'English';
        this.tableLoadingSpinner = true;

        const sub = this.entitiesService.listEntities().subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('list', response);
                    return;
                }
                console.log('response', response);
                const entitiesData = response?.message || {};
                this.entities = Object.values(entitiesData).map((item: any) => ({
                    id: String(item?.Entity_ID || ''),
                    code: item?.Code || '',
                    name: isRegional ? item?.Name_Regional || '' : item?.Name || '',
                    description: isRegional ? item?.Description_Regional || '' : item?.Description || '',
                    parentEntityId: item?.Parent_Entity_ID ? String(item?.Parent_Entity_ID) : '',
                    active: Boolean(item?.Is_Active),
                    isPersonal: Boolean(item?.Is_Personal)
                }));

                this.buildActivationControls();
            },
            complete: () => this.resetLoadingFlags()
        });

        this.subscriptions.push(sub);
    }

    edit(entity: Entity): void {
        if (entity.id) {
            this.router.navigate(['/company-administration/entities', entity.id, 'edit']);
        }
    }

    assignAdmin(entity: Entity): void {
        if (entity.id) {
            this.router.navigate(['/company-administration/entities', entity.id, 'assign-admin']);
        }
    }

    openMenu(menuRef: any, entity: Entity, event: Event): void {
        this.currentEntity = entity;
        menuRef.toggle(event);
    }

    onStatusToggle(entity: Entity): void {
        this.currentEntityForActivation = entity;
        this.activationEntityDialog = true;
    }

    onCancelActivationDialog(): void {
        this.activationEntityDialog = false;
        if (this.currentEntityForActivation) {
            const control = this.activationControls[this.currentEntityForActivation.id];
            if (control) {
                control.setValue(this.currentEntityForActivation.active, { emitEvent: false });
            }
        }
        this.currentEntityForActivation = undefined;
    }

    activation(value: boolean): void {
        if (!this.currentEntityForActivation) {
            return;
        }

        const entity = this.currentEntityForActivation;
        const control = this.activationControls[entity.id];
        if (!control) {
            return;
        }

        control.disable();
        const context: EntityActionContext = value ? 'activate' : 'deactivate';
        const toggle$ = value
            ? this.entitiesService.activateEntity(entity.id)
            : this.entitiesService.deactivateEntity(entity.id);

        const sub = toggle$.subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(context, response);
                    control.setValue(!value, { emitEvent: false });
                    this.activationEntityDialog = false;
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: value ? 'Entity activated successfully.' : 'Entity deactivated successfully.',
                    life: 3000
                });
                entity.active = value;
                this.activationEntityDialog = false;
                this.loadEntities(true);
            },
            complete: () => {
                control.enable();
                this.currentEntityForActivation = undefined;
            }
        });

        this.subscriptions.push(sub);
    }

    confirmDelete(entity: Entity): void {
        this.currentEntityForDelete = entity;
        this.deleteEntityDialog = true;
    }

    onCancelDeleteDialog(): void {
        this.deleteEntityDialog = false;
        this.currentEntityForDelete = undefined;
    }

    deleteEntity(): void {
        if (!this.currentEntityForDelete) {
            return;
        }

        const entity = this.currentEntityForDelete;

        const sub = this.entitiesService.deleteEntity(entity.id).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('delete', response);
                    this.deleteEntityDialog = false;
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Deleted',
                    detail: `${entity.name} deleted successfully.`,
                    life: 3000
                });
                this.deleteEntityDialog = false;
                this.loadEntities(true);
            },
            complete: () => {
                this.currentEntityForDelete = undefined;
            }
        });

        this.subscriptions.push(sub);
    }

    navigateToNew(): void {
        this.router.navigate(['/company-administration/entities/new']);
    }

    onSearchInput(event: Event, table: any): void {
        const target = event.target as HTMLInputElement;
        const searchValue = target?.value || '';
        table.filterGlobal(searchValue, 'contains');
    }

    getTypeLabel(entity: Entity): string {
        return entity.isPersonal ? 'Personal' : 'Organization';
    }

    getTypeSeverity(entity: Entity): 'success' | 'warning' | 'info' | 'danger' | 'secondary' {
        return entity.isPersonal ? 'warning' : 'info';
    }

    getStatusSeverity(status: boolean): string {
        return status ? 'success' : 'danger';
    }

    getStatusLabel(status: boolean): string {
        return status ? 'Active' : 'Inactive';
    }

    getParentLabel(entity: Entity): string {
        return entity.parentEntityId ? `Child of #${entity.parentEntityId}` : 'Root Entity';
    }

    private buildActivationControls(): void {
        this.activationControls = {};
        this.entities.forEach((entity) => {
            this.activationControls[entity.id] = new FormControl<boolean>(entity.active, { nonNullable: true });
        });
    }

    private configureMenuItems(): void {
        this.menuItems = [
            {
                label: 'Edit',
                icon: 'pi pi-user-edit',
                command: () => this.currentEntity && this.edit(this.currentEntity)
            },
            {
                label: 'Assign Admin',
                icon: 'pi pi-user-plus',
                command: () => this.currentEntity && this.assignAdmin(this.currentEntity)
            },
            {
                label: 'Delete',
                icon: 'pi pi-trash',
                command: () => this.currentEntity && this.confirmDelete(this.currentEntity)
            }
        ];
    }

    private handleBusinessError(context: EntityActionContext, response: any): void {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'activate':
                detail = this.getActivateErrorMessage(code);
                break;
            case 'deactivate':
                detail = this.getDeactivateErrorMessage(code);
                break;
            case 'delete':
                detail = this.getDeleteErrorMessage(code);
                break;
            default:
                detail = 'Session expired. Please login again.';
        }

        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail
        });

        if (context === 'list') {
            this.resetLoadingFlags();
        }
    }

    private getActivateErrorMessage(code: string): string {
        switch (code) {
            case 'ERP11260':
                return 'Invalid entity selected.';
            case 'ERP11261':
                return 'Parent entities cannot be activated or deactivated from this screen.';
            case 'ERP11262':
                return 'Entity is already active.';
            default:
                return 'Session expired. Please login again.';
        }
    }

    private getDeactivateErrorMessage(code: string): string {
        switch (code) {
            case 'ERP11260':
                return 'Invalid entity selected.';
            case 'ERP11261':
                return 'Parent entities cannot be activated or deactivated from this screen.';
            case 'ERP11263':
                return 'Entity is already inactive.';
            default:
                return 'Session expired. Please login again.';
        }
    }

    private getDeleteErrorMessage(code: string): string {
        switch (code) {
            case 'ERP11260':
                return 'Invalid entity selected.';
            case 'ERP11270':
                return 'Entity cannot be removed because it still has data.';
            default:
                return 'Session expired. Please login again.';
        }
    }

    private resetLoadingFlags(): void {
        this.tableLoadingSpinner = false;
    }
}

