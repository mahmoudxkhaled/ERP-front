import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Table } from 'primeng/table';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ILanguageModel } from '../../models/ILanguageModel';
import { LanguageService } from '../../services/language.service';
import { MenuItem, MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { Router } from '@angular/router';
import { IPaginationModel } from 'src/app/core/Dtos/IPaginationModel';

@Component({
    selector: 'app-language-listing',
    templateUrl: './language-listing.component.html',
    styleUrl: './language-listing.component.scss',
})
export class LanguageListingComponent implements OnInit, OnDestroy {
    tableLoadingSpinner: boolean = true;

    unsubscribe: Subscription[] = [];
    deleteDialog: boolean = false;
    editeDialog: boolean = false;
    activationDialog: boolean = false;
    addDialog: boolean = false;
    languages: ILanguageModel[] = [];
    menuItems: MenuItem[] = [];
    currentSelected: ILanguageModel = {
        id: '',
        isActive: false,
        name: '',
        code: '',
        isDefaultLanguage: false,
    };
    language: ILanguageModel[] = [];
    languageAddForm!: FormGroup;
    languageEditForm!: FormGroup;
    // TODO: Removed - missing service dependencies
    // pagePermessions: IAspNetPageItemModel[] = [];
    // actions = constants.pageActions;
    languagesPagiantion: IPaginationModel = {
        page: 0,
        size: 10,
        searchQuery: ''
    };
    totalRecords: number = 0;

    constructor(
        private apiService: LanguageService,
        private messageService: MessageService,
        private translate: TranslationService
    ) {
        // TODO: Removed - missing service dependencies
        // this.pagePermessions = this.permessionService.getPagePermessions(constants.pages.language);
    }

    ngOnInit(): void {
        // TODO: Removed - tableLoadingService dependency
        // Manual spinner management will be used instead

        this.menuItems = [];
        const editBtn = {
            label: this.translate.getInstant('shared.actions.edit'),
            icon: 'pi pi-fw pi-pencil',
            command: () => this.openEditDialog(this.currentSelected),
        };
        const deleteBtn = {
            label: this.translate.getInstant('shared.actions.delete'),
            icon: 'pi pi-fw pi-trash',
            command: () => this.openDeleteDialog(this.currentSelected),
        };
        this.menuItems = [];
        // TODO: Removed - permission checks
        this.menuItems.push(editBtn);
        this.menuItems.push(deleteBtn);
        this.initiateAddForm();
        this.initiateEditeForm();
    }

    assigneCurrentSelect(lang: ILanguageModel) {
        this.currentSelected = lang;
    }

    fetchLanguages() {
        this.tableLoadingSpinner = true;

        const x = this.apiService.getAllLanguagesPagination(this.languagesPagiantion).subscribe({
            next: (response) => {
                this.languages = response.data;
                console.log('languages', this.languages);
                this.totalRecords = response.totalRecords;
                this.tableLoadingSpinner = false;
            },
            error: (error) => { },
        });
        this.unsubscribe.push(x);
    }

    lazyLoadLanguages(event: any) {
        this.languagesPagiantion.searchQuery = event.globalFilter || '';
        this.languagesPagiantion.page = Math.floor(event.first / event.rows);
        this.languagesPagiantion.size = event.rows;
        this.fetchLanguages();
        this.scrollToTop();
    }

    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }



    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    navigateToCreate() {
        this.addDialog = true;
    }

    openEditDialog(language: ILanguageModel) {
        this.editeDialog = true;
        this.currentSelected = language;
        this.languageEditForm.patchValue({
            nameLanguageToEdit: language.name,
            codeLanguageToEdit: language.code,
            isDefaultLanguageLanguageToEdit: language.isDefaultLanguage,
            isActiveLanguageToEdit: language.isActive,
        });
    }

    openDeleteDialog(group: ILanguageModel) {
        this.deleteDialog = true;
        this.currentSelected = group;
    }

    openActivationDialog(language: ILanguageModel) {
        this.activationDialog = true;
        this.currentSelected = language;
    }

    hideDialog() {
        this.editeDialog = false;
    }

    onSubmit() {
        if (this.languageAddForm.valid) {
            const newGroup: ILanguageModel = {
                id: '',
                name: this.languageAddForm.value.nameLanguageToAdd,
                code: this.languageAddForm.value.codeLanguageToAdd,
                isDefaultLanguage: this.languageAddForm.value.isDefaultLanguageLanguageToAdd,
                isActive: this.languageAddForm.value.isActiveLanguageToAdd,
            };

            this.apiService.addLanguage(newGroup).subscribe({
                next: (res) => {
                    this.fetchLanguages();
                    this.addDialog = false;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'language updated successfully',
                    });
                },
                error: (error) => { },
            });
        }
    }

    edit() {
        if (this.languageEditForm.valid) {
            const newLanguage: ILanguageModel = {
                id: this.currentSelected.id,
                name: this.languageEditForm.value.nameLanguageToEdit,
                code: this.languageEditForm.value.codeLanguageToEdit,
                isDefaultLanguage: this.languageEditForm.value.isDefaultLanguageLanguageToEdit,
            };
            const x = this.apiService.editLanguage(newLanguage).subscribe({
                next: (res) => {
                    this.fetchLanguages();
                    this.hideDialog();
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'language updated successfully',
                    });
                },
                error: (error) => { },
            });
            this.unsubscribe.push(x);
        }
    }

    delete() {
        const x = this.apiService.deleteLanguage(this.currentSelected.id!).subscribe({
            next: (res) => {
                this.deleteDialog = false;
                if (res.code === 300) {
                    this.messageService.add({ severity: 'warn', summary: 'Warning', detail: res.message, life: 3000 });
                    return;
                }
                this.fetchLanguages();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Successful',
                    detail: 'language deleted successfully',
                    life: 3000,
                });
            },
            error: (error) => { },
        });
        this.unsubscribe.push(x);
    }

    activation(value: boolean) {
        if (value) {
            const x = this.apiService.activateLanguage(this.currentSelected.id!).subscribe({
                next: (res) => {
                    this.fetchLanguages();
                    this.activationDialog = false;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Successful',
                        detail: 'Language activated successfully',
                        life: 3000,
                    });
                },
                error: (error) => { },
            });
            this.unsubscribe.push(x);
        } else {
            const x = this.apiService.deActivateLanguage(this.currentSelected.id!).subscribe({
                next: (res) => {
                    this.fetchLanguages();
                    this.activationDialog = false;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Successful',
                        detail: 'Language deactivated successfully',
                        life: 3000,
                    });
                },
                error: (error) => { },
            });
            this.unsubscribe.push(x);
        }
    }

    initiateAddForm() {
        this.languageAddForm = new FormGroup({
            nameLanguageToAdd: new FormControl<string>('', [Validators.required]),
            codeLanguageToAdd: new FormControl<string>('', Validators.required),
            isDefaultLanguageLanguageToAdd: new FormControl<boolean>(false, Validators.required),
            isActiveLanguageToAdd: new FormControl<boolean>(false, Validators.required),
        });
    }

    initiateEditeForm() {
        this.languageEditForm = new FormGroup({
            nameLanguageToEdit: new FormControl<string>('', [Validators.required]),
            codeLanguageToEdit: new FormControl<string>('', Validators.required),
            isDefaultLanguageLanguageToEdit: new FormControl<boolean>(false, Validators.required),
        });
    }

    hasPermission(controlKey: string): boolean {
        // TODO: Removed - permission checks
        return true;
    }

    ngOnDestroy(): void {
        this.unsubscribe.forEach((u) => {
            u.unsubscribe();
        });
    }
}
