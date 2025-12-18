import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslationService } from 'src/app/core/services/translation.service';
import { MessageService } from 'primeng/api';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IUserDetails, IAccountDetails, IEntityDetails, IAccountSettings } from 'src/app/core/models/account-status.model';

@Component({
    selector: 'app-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
    providers: [MessageService]
})
export class ProfileComponent implements OnInit {

    profileForm!: FormGroup;

    gender: boolean = false;

    userDetails: IUserDetails | null = null;
    accountDetails: IAccountDetails | null = null;
    entityDetails: IEntityDetails | null = null;
    accountSettings: IAccountSettings | null = null;
    isRegional: boolean = false;
    profilePictureUrl: string = '';

    genderOptions = [
        { label: 'Male', value: true },
        { label: 'Female', value: false }
    ];

    constructor(
        private fb: FormBuilder,
        public translate: TranslationService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) { }

    ngOnInit(): void {
        this.loadUserData();
        this.initFormModels();
        this.gender = this.localStorageService.getGender() || false;

        if (this.gender) {
            this.profilePictureUrl = this.accountDetails?.Profile_Picture || 'assets/media/avatar.png';
        } else {
            this.profilePictureUrl = this.accountDetails?.Profile_Picture || 'assets/media/female-avatar.png';
        }
    }

    loadUserData(): void {
        this.userDetails = this.localStorageService.getUserDetails();
        this.accountDetails = this.localStorageService.getAccountDetails();
        this.entityDetails = this.localStorageService.getEntityDetails();
        this.accountSettings = this.localStorageService.getAccountSettings();

        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    initFormModels() {
        const firstName = this.getFirstName();
        const lastName = this.getLastName();
        const middleName = this.getMiddleName();
        const prefix = this.getPrefix();
        const email = this.accountDetails?.Email || '';
        const description = this.accountDetails?.Description || '';
        const entityName = this.entityDetails?.Name || '';
        const entityCode = this.entityDetails?.Code || '';
        const entityDescription = this.entityDetails?.Description || '';
        const gender = this.userDetails?.Gender !== undefined ? this.userDetails.Gender : null;
        const accountId = this.accountDetails?.Account_ID || null;
        const userId = this.userDetails?.User_ID || null;
        const entityId = this.entityDetails?.Entity_ID || null;
        const accountState = this.accountDetails?.Account_State || null;

        this.profileForm = this.fb.group({
            First_Name: [firstName, [Validators.required]],
            Middle_Name: [middleName],
            Last_Name: [lastName, [Validators.required]],
            Prefix: [prefix],
            Email: [email, [Validators.required, Validators.email]],
            Description: [description],
            Gender: [gender],
            Account_ID: [accountId],
            User_ID: [userId],
            Entity_ID: [entityId],
            Account_State: [accountState],
            Entity_Name: [entityName],
            Entity_Code: [entityCode],
            Entity_Description: [entityDescription]
        });
    }

    saveProfileInfo(): void {
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('shared.messages.success'),
            detail: this.translate.getInstant('profile.messages.saveSuccess')
        });
    }

    resetForm(): void {
        const firstName = this.getFirstName();
        const lastName = this.getLastName();
        const middleName = this.getMiddleName();
        const prefix = this.getPrefix();
        const email = this.accountDetails?.Email || '';
        const description = this.accountDetails?.Description || '';
        const entityName = this.entityDetails?.Name || '';
        const entityCode = this.entityDetails?.Code || '';
        const entityDescription = this.entityDetails?.Description || '';
        const gender = this.userDetails?.Gender !== undefined ? this.userDetails.Gender : null;
        const accountId = this.accountDetails?.Account_ID || null;
        const userId = this.userDetails?.User_ID || null;
        const entityId = this.entityDetails?.Entity_ID || null;
        const accountState = this.accountDetails?.Account_State || null;

        this.profileForm.reset({
            First_Name: firstName,
            Middle_Name: middleName,
            Last_Name: lastName,
            Prefix: prefix,
            Email: email,
            Description: description,
            Gender: gender,
            Account_ID: accountId,
            User_ID: userId,
            Entity_ID: entityId,
            Account_State: accountState,
            Entity_Name: entityName,
            Entity_Code: entityCode,
            Entity_Description: entityDescription
        });

        this.messageService.add({
            severity: 'info',
            summary: this.translate.getInstant('profile.actions.reset'),
            detail: this.translate.getInstant('profile.messages.resetInfo')
        });
    }

    getFirstName(): string {
        if (!this.userDetails) return '';

        if (this.isRegional) {
            const firstNameRegional = this.userDetails.First_Name_Regional || '';
            if (firstNameRegional.trim()) {
                return firstNameRegional;
            }
        }
        return this.userDetails.First_Name || '';
    }

    getLastName(): string {
        if (!this.userDetails) return '';

        if (this.isRegional) {
            const lastNameRegional = this.userDetails.Last_Name_Regional || '';
            if (lastNameRegional.trim()) {
                return lastNameRegional;
            }
        }
        return this.userDetails.Last_Name || '';
    }

    getMiddleName(): string {
        if (!this.userDetails) return '';

        if (this.isRegional) {
            const middleNameRegional = this.userDetails.Middle_Name_Regional || '';
            if (middleNameRegional.trim()) {
                return middleNameRegional;
            }
        }
        return this.userDetails.Middle_Name || '';
    }

    getPrefix(): string {
        if (!this.userDetails) return '';

        if (this.isRegional) {
            const prefixRegional = this.userDetails.Prefix_Regional || '';
            if (prefixRegional.trim()) {
                return prefixRegional;
            }
        }
        return this.userDetails.Prefix || '';
    }

    cancelEdit(): void {
        this.messageService.add({
            severity: 'warn',
            summary: this.translate.getInstant('shared.actions.cancel'),
            detail: this.translate.getInstant('profile.messages.cancelInfo')
        });
    }

    getUserId(): string {
        const userData = this.localStorageService.getItem('userData');
        if (userData) {
            return userData.userId || userData.id || '';
        }
        return '';
    }
}
