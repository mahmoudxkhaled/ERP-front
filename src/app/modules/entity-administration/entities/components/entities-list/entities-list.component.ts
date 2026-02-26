import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { EntitiesService } from '../../services/entities.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { Entity, EntityBackend, EntitiesListResponse } from '../../models/entities.model';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { Roles } from 'src/app/core/models/system-roles';
import { PermissionService } from 'src/app/core/services/permission.service';

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

    /** When loading and entities is empty, return placeholder rows so the table can show skeleton cells. */
    get tableValue(): Entity[] {
        if (this.tableLoadingSpinner && this.entities.length === 0) {
            return Array(10).fill(null).map(() => ({} as Entity));
        }
        return this.entities;
    }
    activationControls: Record<string, FormControl<boolean>> = {};
    menuItems: MenuItem[] = [];
    currentEntity?: Entity;
    accountSettings: IAccountSettings;
    activationEntityDialog: boolean = false;
    currentEntityForActivation?: Entity;
    deleteEntityDialog: boolean = false;
    currentEntityForDelete?: Entity;

    // Pagination
    first: number = 0;
    rows: number = 10;
    totalRecords: number = 0;

    // Text filter for server-side search
    textFilter: string = '';

    constructor(
        private entitiesService: EntitiesService,
        private router: Router,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService,
        private translate: TranslationService
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

        // API uses negative page numbers: -1 = page 1, -2 = page 2, etc.
        const currentPage = Math.floor(this.first / this.rows) + 1;
        const lastEntityId = -currentPage;

        const sub = this.entitiesService.listEntities(lastEntityId, this.rows, this.textFilter).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('list', response);
                    return;
                }
                this.totalRecords = Number(response.message.Total_Count);

                let entitiesData: any = {};
                const messageData = response.message.Entities;
                entitiesData = {};
                Object.keys(messageData).forEach((key) => {
                    const item = messageData[key];
                    if (typeof item === 'object' && item !== null && item.Entity_ID !== undefined) {
                        entitiesData[key] = item;
                    }
                });

                this.entities = Object.values(entitiesData).map((item: any) => {
                    return {
                        id: String(item?.Entity_ID || ''),
                        code: item?.Code || '',
                        name: isRegional ? item?.Name_Regional || '' : item?.Name || '',
                        description: isRegional ? item?.Description_Regional || '' : item?.Description || '',
                        parentEntityId: item?.Parent_Entity_ID ? String(item?.Parent_Entity_ID) : '',
                        active: Boolean(item?.Is_Active),
                        isPersonal: Boolean(item?.Is_Personal)
                    };
                });
                this.buildActivationControls();
            },
            complete: () => this.resetLoadingFlags()
        });

        this.subscriptions.push(sub);
    }


    onPageChange(event: any): void {
        this.first = event.first;
        this.rows = event.rows;
        this.loadEntities(true);
    }

    isFirstPage(): boolean {
        return this.first === 0;
    }

    isLastPage(): boolean {
        return this.totalRecords > 0 ? this.first + this.rows >= this.totalRecords : true;
    }

    edit(entity: Entity): void {
        if (entity.id) {
            this.router.navigate(['/entity-administration/entities', entity.id, 'edit']);
        }
    }

    viewDetails(entity: Entity): void {
        if (entity.id) {
            this.router.navigate(['/entity-administration/entities', entity.id]);
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
        this.router.navigate(['/entity-administration/entities/new']);
    }

    onSearchInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        const searchValue = target?.value || '';
        this.textFilter = searchValue;
        this.first = 0; // Reset to first page when filter changes
        this.loadEntities(true);
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
        return entity.parentEntityId ? `Sub from #${entity.parentEntityId}` : 'Root Entity';
    }

    private buildActivationControls(): void {
        this.activationControls = {};
        this.entities.forEach((entity) => {
            this.activationControls[entity.id] = new FormControl<boolean>(entity.active, { nonNullable: true });
        });
    }

    private configureMenuItems(): void {
        const canDeleteEntity = this.permissionService.can('Delete_Entity');

        this.menuItems = [
            {
                label: this.translate.getInstant('shared.actions.viewDetails'),
                icon: 'pi pi-eye',
                command: () => this.currentEntity && this.viewDetails(this.currentEntity)
            },
            ...(canDeleteEntity ? [{
                label: this.translate.getInstant('shared.actions.delete'),
                icon: 'pi pi-trash',
                command: () => this.currentEntity && this.confirmDelete(this.currentEntity)
            }] : [])
        ];
    }

    private handleBusinessError(context: EntityActionContext, response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'list':
                detail = this.getListErrorMessage(code) || '';
                break;
            case 'activate':
                detail = this.getActivateErrorMessage(code) || '';
                break;
            case 'deactivate':
                detail = this.getDeactivateErrorMessage(code) || '';
                break;
            case 'delete':
                detail = this.getDeleteErrorMessage(code) || '';
                break;
            default:
                return null;
        }

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }

        if (context === 'list') {
            this.resetLoadingFlags();
        }
        return null;
    }

    private getListErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11255':
                return 'Invalid value for the Filter_Count parameter, should be a minimum of 5 records, and a maximum of 100 records';
            default:
                return null;
        }
    }

    private getActivateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11260':
                return 'Invalid Entity ID';
            case 'ERP11261':
                return 'An entity administrator cannot activate/deactivate his parent entity';
            case 'ERP11262':
                return 'The entity is already active';
            default:
                return null;
        }
    }

    private getDeactivateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11260':
                return 'Invalid Entity ID';
            case 'ERP11261':
                return 'An entity administrator cannot activate/deactivate his parent entity';
            case 'ERP11263':
                return 'The entity is already deactivated';
            default:
                return null;
        }
    }

    private getDeleteErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11260':
                return 'Invalid Entity ID';
            case 'ERP11270':
                return 'The entity contains accounts and other data. It should be either deactivated, or all linked records need to be deleted first';
            default:
                return null;
        }
    }

    private resetLoadingFlags(): void {
        this.tableLoadingSpinner = false;
    }
}

