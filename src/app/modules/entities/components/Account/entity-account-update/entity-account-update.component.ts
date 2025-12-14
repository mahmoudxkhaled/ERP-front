import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EntitiesService } from '../../../services/entities.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { Entity } from '../../../models/entities.model';
import { RolesService } from 'src/app/modules/roles/services/roles.service';

@Component({
  selector: 'app-entity-account-update',
  templateUrl: './entity-account-update.component.html',
  styleUrl: './entity-account-update.component.scss'
})
export class EntityAccountUpdateComponent implements OnInit, OnChanges, OnDestroy {
  @Input() visible: boolean = false;
  @Input() accountEmail: string = '';
  @Output() onSave = new EventEmitter<{ email: string; entityId: number; entityRoleId: number }>();
  @Output() onCancel = new EventEmitter<void>();
  @Output() onClose = new EventEmitter<void>();

  updateEntityForm!: FormGroup;

  // Entity selection table
  entitiesForSelection: Entity[] = [];
  selectedEntityForUpdate?: Entity;
  entityTableFirst: number = 0;
  entityTableRows: number = 10;
  entityTableTotalRecords: number = 0;
  entityTableTextFilter: string = '';
  loadingEntitiesTable: boolean = false;
  entitySelectionDialogVisible: boolean = false;

  // Entity Role dropdown options
  entityRoleOptions: any[] = [];
  loadingRoles: boolean = false;

  savingAccountEntity: boolean = false;
  accountSettings: IAccountSettings;
  isRegional: boolean = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private entitiesService: EntitiesService,
    private localStorageService: LocalStorageService,
    private rolesService: RolesService
  ) {
    this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
    this.isRegional = this.accountSettings?.Language !== 'English';
    this.initForm();
  }

  ngOnInit(): void {
    // Form is already initialized in constructor
  }

  ngOnChanges(changes: SimpleChanges): void {
    // When dialog opens (visible becomes true) or accountEmail changes
    if (changes['visible']?.currentValue === true || changes['accountEmail']?.currentValue) {
      if (this.accountEmail) {
        this.loadAccountDetails();
      }
    }

    // When dialog closes, reset state
    if (changes['visible']?.previousValue === true && changes['visible']?.currentValue === false) {
      this.resetState();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initForm(): void {
    this.updateEntityForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      entityId: [0, [Validators.required, Validators.min(1)]],
      entityRoleId: [0, [Validators.required, Validators.min(1)]]
    });
  }

  private resetState(): void {
    this.updateEntityForm.reset();
    this.selectedEntityForUpdate = undefined;
    this.entityTableTextFilter = '';
    this.entityTableFirst = 0;
    this.entitiesForSelection = [];
    this.entityRoleOptions = [];
  }

  loadAccountDetails(): void {
    if (!this.accountEmail) {
      return;
    }

    // Reset table state
    this.selectedEntityForUpdate = undefined;
    this.entityTableTextFilter = '';
    this.entityTableFirst = 0;
    // Don't auto-load entities table - only load when dialog opens

    // Load account details
    const sub = this.entitiesService.getAccountDetails(this.accountEmail).subscribe({
      next: (response: any) => {
        if (response?.success) {
          const accountData = response?.message || {};
          const currentEntityId = accountData.Entity_ID || 0;
          this.updateEntityForm.patchValue({
            email: this.accountEmail,
            entityId: currentEntityId,
            entityRoleId: accountData.Entity_Role_ID || 0
          });

          // Load roles for the current entity if entityId exists
          if (currentEntityId && currentEntityId > 0) {
            this.loadEntityRoles(currentEntityId);
          }
        } else {
          this.updateEntityForm.patchValue({
            email: this.accountEmail,
            entityId: 0,
            entityRoleId: 0
          });
        }
      },
      error: () => {
        this.updateEntityForm.patchValue({
          email: this.accountEmail,
          entityId: 0,
          entityRoleId: 0
        });
      }
    });

    this.subscriptions.push(sub);
  }

  // Entity Selection Table Methods
  loadEntitiesForSelection(forceReload: boolean = false): void {
    if (this.entitiesService.isLoadingSubject.value && !forceReload) {
      return;
    }

    this.loadingEntitiesTable = true;

    // API uses negative page numbers: -1 = page 1, -2 = page 2, etc.
    const currentPage = Math.floor(this.entityTableFirst / this.entityTableRows) + 1;
    const lastEntityId = -currentPage;

    const sub = this.entitiesService.listEntities(lastEntityId, this.entityTableRows, this.entityTableTextFilter).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.loadingEntitiesTable = false;
          return;
        }

        this.entityTableTotalRecords = Number(response.message.Total_Count || 0);

        let entitiesData: any = {};
        const messageData = response.message.Entities || {};
        Object.keys(messageData).forEach((key) => {
          const item = messageData[key];
          if (typeof item === 'object' && item !== null && item.Entity_ID !== undefined) {
            entitiesData[key] = item;
          }
        });

        this.entitiesForSelection = Object.values(entitiesData).map((item: any) => {
          return {
            id: String(item?.Entity_ID || ''),
            code: item?.Code || '',
            name: this.isRegional ? (item?.Name_Regional || item?.Name || '') : (item?.Name || ''),
            description: this.isRegional ? (item?.Description_Regional || item?.Description || '') : (item?.Description || ''),
            parentEntityId: item?.Parent_Entity_ID ? String(item?.Parent_Entity_ID) : '',
            active: Boolean(item?.Is_Active),
            isPersonal: Boolean(item?.Is_Personal)
          };
        });

        this.loadingEntitiesTable = false;
      },
      error: () => {
        this.loadingEntitiesTable = false;
      }
    });

    this.subscriptions.push(sub);
  }

  onEntityTablePageChange(event: any): void {
    this.entityTableFirst = event.first;
    this.entityTableRows = event.rows;
    this.loadEntitiesForSelection(true);
  }

  onEntityTableSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const searchValue = target?.value || '';
    this.entityTableTextFilter = searchValue;
    this.entityTableFirst = 0; // Reset to first page when filter changes
    this.loadEntitiesForSelection(true);
  }

  selectEntityForUpdate(entity: Entity): void {
    this.selectedEntityForUpdate = entity;
    this.updateEntityForm.patchValue({
      entityId: Number(entity.id),
      entityRoleId: 0 // Clear role selection when entity changes
    });
    this.loadEntityRoles(Number(entity.id));
  }

  selectEntityById(entityId: string): void {
    // Try to find entity in current list
    const entity = this.entitiesForSelection.find(e => e.id === entityId);
    if (entity) {
      this.selectEntityForUpdate(entity);
    } else {
      // If not found in current page, just set the form value
      this.updateEntityForm.patchValue({
        entityId: Number(entityId)
      });
    }
  }

  loadEntityRoles(entityId: number): void {
    if (!entityId || entityId === 0) {
      this.entityRoleOptions = [];
      return;
    }

    this.loadingRoles = true;
    const sub = this.rolesService.listEntityRoles(entityId, 0, 100).subscribe({
      next: (response: any) => {
        if (response?.success) {
          const rolesData = response?.message?.Entity_Roles || {};
          this.entityRoleOptions = Object.values(rolesData).map((item: any) => ({
            label: this.isRegional ? (item?.Title_Regional || item?.Title || '') : (item?.Title || ''),
            value: item?.Entity_Role_ID || 0
          }));
        } else {
          this.entityRoleOptions = [];
        }
        this.loadingRoles = false;
      },
      error: () => {
        this.entityRoleOptions = [];
        this.loadingRoles = false;
      }
    });

    this.subscriptions.push(sub);
  }

  isEntitySelected(entity: Entity): boolean {
    return this.selectedEntityForUpdate?.id === entity.id;
  }

  // Entity Selection Dialog Methods
  openEntitySelectionDialog(): void {
    this.entitySelectionDialogVisible = true;
    this.entityTableTextFilter = '';
    this.entityTableFirst = 0;
    this.loadEntitiesForSelection(true);

    // Try to select current entity if one is set
    const currentEntityId = this.updateEntityForm.get('entityId')?.value;
    if (currentEntityId && currentEntityId !== 0) {
      // Use setTimeout to ensure table is loaded first
      setTimeout(() => {
        this.selectEntityById(String(currentEntityId));
      }, 500);
    }
  }

  closeEntitySelectionDialog(): void {
    this.entitySelectionDialogVisible = false;
  }

  getSelectedEntityDisplayText(): string {
    if (this.selectedEntityForUpdate) {
      return `${this.selectedEntityForUpdate.name} (${this.selectedEntityForUpdate.code})`;
    }
    // Try to find in current selection list
    const entityId = this.updateEntityForm.get('entityId')?.value;
    if (entityId && entityId !== 0) {
      const entity = this.entitiesForSelection.find(e => e.id === String(entityId));
      if (entity) {
        return `${entity.name} (${entity.code})`;
      }
    }
    return 'Select entity';
  }

  saveAccountEntity(): void {
    if (this.updateEntityForm.invalid) {
      this.updateEntityForm.markAllAsTouched();
      return;
    }

    const { email, entityId, entityRoleId } = this.updateEntityForm.value;

    // Emit save event to parent component
    this.onSave.emit({
      email,
      entityId: Number(entityId),
      entityRoleId: Number(entityRoleId)
    });
  }

  onCloseDialog(): void {
    this.onClose.emit();
  }

  onCancelClick(): void {
    this.onCancel.emit();
  }
}
