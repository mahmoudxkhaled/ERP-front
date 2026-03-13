import { Component, ElementRef, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslationService } from 'src/app/core/services/translation.service';
import { MessageService } from 'primeng/api';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { ProfilePictureService } from 'src/app/core/services/profile-picture.service';
import { UserNameService } from 'src/app/core/services/user-name.service';
import { IUserDetails, IAccountDetails, IEntityDetails, IAccountSettings } from 'src/app/core/models/account-status.model';
import { ProfileApiService } from '../../../services/profile-api.service';
import { ProfileContactInfo, ProfilePreferences } from '../../../models/profile.model';
import { Observable, Subscription } from 'rxjs';
import { nameFieldValidator, getNameFieldError, textFieldValidator, getTextFieldError } from 'src/app/core/validators/text-field.validator';
import { FileUpload } from 'primeng/fileupload';

type ProfileContext = 'update' | 'contact' | 'preferences' | 'picture';

@Component({
    selector: 'app-profile-edit',
    templateUrl: './profile-edit.component.html',
    styleUrls: ['./profile-edit.component.scss'],
    providers: [MessageService]
})
export class ProfileEditComponent implements OnInit, OnDestroy {

    @ViewChild('profilePictureUploader') profilePictureUploader?: FileUpload;
    @ViewChild('cropImage') cropImageRef?: ElementRef<HTMLImageElement>;

    profileForm!: FormGroup;
    contactInfoForm!: FormGroup;
    preferencesForm!: FormGroup;

    gender: boolean = false;

    userDetails: IUserDetails | null = null;
    accountDetails: IAccountDetails | null = null;
    entityDetails: IEntityDetails | null = null;
    accountSettings: IAccountSettings | null = null;
    isRegional: boolean = false;
    profilePictureUrl: string = '';
    hasProfilePicture: boolean = false;

    // API integration properties
    currentUserId: number | null = null;
    userContactInfo: ProfileContactInfo | null = null;
    userPreferences: ProfilePreferences = {};
    isLoading$: Observable<boolean>;
    loadingContactInfo: boolean = false;
    loadingPreferences: boolean = false;
    loadingProfilePicture: boolean = false;
    saving: boolean = false;
    savingContactInfo: boolean = false;
    savingPreferences: boolean = false;
    uploadingPicture: boolean = false;

    // Crop dialog: position photo so head is in focus before upload
    showCropDialog: boolean = false;
    pendingCropDataUrl: string = '';
    pendingCropFile: File | null = null;
    pendingCropFileExtension: string = 'png';
    cropPosition: { x: number; y: number } = { x: 0, y: 0 };
    cropDisplayWidth: number = 200;
    cropDisplayHeight: number = 200;
    private cropNaturalWidth: number = 0;
    private cropNaturalHeight: number = 0;
    private isCropDragging: boolean = false;
    private lastCropMouseX: number = 0;
    private lastCropMouseY: number = 0;

    genderOptions = [
        { label: 'Male', value: true },
        { label: 'Female', value: false }
    ];

    private subscriptions: Subscription[] = [];

    constructor(
        private fb: FormBuilder,
        public translate: TranslationService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private profileApiService: ProfileApiService,
        private profilePictureService: ProfilePictureService,
        private userNameService: UserNameService,
        private router: Router
    ) {
        this.isLoading$ = this.profileApiService.isLoadingSubject.asObservable();
    }

    ngOnInit(): void {
        this.loadUserData();
        this.initFormModels();
        this.initContactInfoForm();
        this.initPreferencesForm();
        this.gender = this.localStorageService.getGender() || false;

        // Get current user ID and load data from API
        this.currentUserId = this.userDetails?.User_ID || null;
        if (this.currentUserId) {
            this.loadUserDetailsFromAPI();
            this.loadContactInfo();
            this.loadPreferences();
            this.loadProfilePicture();
        } else {
            // Fallback to localStorage profile picture
            if (this.gender) {
                this.profilePictureUrl = this.accountDetails?.Profile_Picture || 'assets/media/avatar.png';
            } else {
                this.profilePictureUrl = this.accountDetails?.Profile_Picture || 'assets/media/female-avatar.png';
            }
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadUserData(): void {
        this.userDetails = this.localStorageService.getUserDetails();
        this.accountDetails = this.localStorageService.getAccountDetails();
        this.entityDetails = this.localStorageService.getEntityDetails();
        this.accountSettings = this.localStorageService.getAccountSettings();

        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    loadUserDetailsFromAPI(): void {
        if (!this.currentUserId) {
            return;
        }

        const sub = this.profileApiService.getUserDetails(this.currentUserId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('update', response);
                    return;
                }

                const userData = response?.message || {};
                const firstName = this.isRegional ? (userData?.First_Name_Regional || userData?.First_Name || '') : (userData?.First_Name || '');
                const middleName = this.isRegional ? (userData?.Middle_Name_Regional || userData?.Middle_Name || '') : (userData?.Middle_Name || '');
                const lastName = this.isRegional ? (userData?.Last_Name_Regional || userData?.Last_Name || '') : (userData?.Last_Name || '');
                const prefix = this.isRegional ? (userData?.Prefix_Regional || userData?.Prefix || '') : (userData?.Prefix || '');
                const gender = userData?.Gender !== undefined ? Boolean(userData.Gender) : (this.userDetails?.Gender || false);

                this.profileForm.patchValue({
                    First_Name: firstName,
                    Middle_Name: middleName,
                    Last_Name: lastName,
                    Prefix: prefix,
                    Gender: gender
                });

                // Update userDetails in memory
                if (this.userDetails) {
                    this.userDetails.First_Name = userData?.First_Name || '';
                    this.userDetails.Middle_Name = userData?.Middle_Name || '';
                    this.userDetails.Last_Name = userData?.Last_Name || '';
                    this.userDetails.Prefix = userData?.Prefix || '';
                    this.userDetails.Gender = gender;

                    // Also update regional fields if available
                    this.userDetails.First_Name_Regional = userData?.First_Name_Regional || '';
                    this.userDetails.Middle_Name_Regional = userData?.Middle_Name_Regional || '';
                    this.userDetails.Last_Name_Regional = userData?.Last_Name_Regional || '';
                    this.userDetails.Prefix_Regional = userData?.Prefix_Regional || '';

                    // Update localStorage to persist the changes
                    this.localStorageService.setItem('User_Details', this.userDetails);

                    // Sync user name with service to update top bar in real-time
                    this.syncUserName();
                }
            }
        });

        this.subscriptions.push(sub);
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
            First_Name: [firstName, [Validators.required, nameFieldValidator()]],
            Middle_Name: [middleName, [nameFieldValidator()]],
            Last_Name: [lastName, [Validators.required, nameFieldValidator()]],
            Prefix: [prefix, [textFieldValidator()]],
            Email: [email, [Validators.required, Validators.email]],
            Description: [description],
            Gender: [gender, [Validators.required]],
            Account_ID: [accountId],
            User_ID: [userId],
            Entity_ID: [entityId],
            Account_State: [accountState],
            Entity_Name: [entityName],
            Entity_Code: [entityCode],
            Entity_Description: [entityDescription]
        });
    }

    initContactInfoForm(): void {
        this.contactInfoForm = this.fb.group({
            address: [''],
            phoneNumbers: this.fb.array([]),
            linkedinPage: ['',],
            facebookPage: ['',],
            instagramPage: ['',],
            twitterPage: ['',]
        });
    }

    initPreferencesForm(): void {
        this.preferencesForm = this.fb.group({});
    }

    get phoneNumbersFormArray(): FormArray {
        return this.contactInfoForm.get('phoneNumbers') as FormArray;
    }

    addPhoneNumber(): void {
        const phoneGroup = this.fb.group({
            number: ['', [Validators.required, Validators.pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)]]
        });
        this.phoneNumbersFormArray.push(phoneGroup);
    }

    removePhoneNumber(index: number): void {
        // Ensure at least one phone number remains
        if (this.phoneNumbersFormArray.length > 1) {
            this.phoneNumbersFormArray.removeAt(index);
        }
    }

    saveProfileInfo(): void {
        if (!this.currentUserId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'User ID not found.'
            });
            return;
        }

        if (this.profileForm.invalid || this.saving) {
            if (this.profileForm.get('First_Name')?.invalid || this.profileForm.get('Last_Name')?.invalid) {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Validation',
                    detail: 'Please fill in all required fields correctly.'
                });
            }
            return;
        }

        this.saving = true;
        const { First_Name, Middle_Name, Last_Name, Prefix, Gender } = this.profileForm.value;

        const sub = this.profileApiService.updateUserDetails(
            this.currentUserId,
            First_Name?.trim() || '',
            Middle_Name?.trim() || '',
            Last_Name?.trim() || '',
            Prefix?.trim() || '',
            this.isRegional,
            Gender !== undefined ? Gender : true
        ).subscribe({
            next: (response: any) => {
                this.saving = false;
                if (!response?.success) {
                    this.handleBusinessError('update', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: this.translate.getInstant('shared.messages.success'),
                    detail: this.translate.getInstant('profile.messages.saveSuccess')
                });

                // Sync user name with service to update top bar in real-time
                this.syncUserName();

                // Reload user data (this will also update localStorage)
                this.loadUserDetailsFromAPI();
            },
            error: () => {
                this.saving = false;
            }
        });

        this.subscriptions.push(sub);
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

    loadContactInfo(): void {
        if (!this.currentUserId) {
            return;
        }

        this.loadingContactInfo = true;
        const sub = this.profileApiService.getUserContactInfo(this.currentUserId).subscribe({
            next: (response: any) => {
                this.loadingContactInfo = false;
                if (!response?.success) {
                    return;
                }

                console.log('loadContactInfo', response);
                const contactData = response?.message || {};
                const address = this.isRegional ? (contactData?.Address_Regional || contactData?.Address || '') : (contactData?.Address || '');
                const phoneNumbers = contactData?.Phone_Numbers || [];

                this.contactInfoForm.patchValue({
                    address: address,
                    linkedinPage: contactData?.Linkedin_Page || '',
                    facebookPage: contactData?.Facebook_Page || '',
                    instagramPage: contactData?.Instagram_Page || '',
                    twitterPage: contactData?.Twitter_Page || ''
                });

                // Clear existing phone numbers and add loaded ones
                while (this.phoneNumbersFormArray.length !== 0) {
                    this.phoneNumbersFormArray.removeAt(0);
                }
                phoneNumbers.forEach((phone: string) => {
                    const phoneGroup = this.fb.group({
                        number: [phone, [Validators.required, Validators.pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)]]
                    });
                    this.phoneNumbersFormArray.push(phoneGroup);
                });

                // If no phone numbers, add one empty field
                if (this.phoneNumbersFormArray.length === 0) {
                    this.addPhoneNumber();
                }

                this.userContactInfo = {
                    address: address,
                    phoneNumbers: phoneNumbers,
                    linkedinPage: contactData?.Linkedin_Page || '',
                    facebookPage: contactData?.Facebook_Page || '',
                    instagramPage: contactData?.Instagram_Page || '',
                    twitterPage: contactData?.Twitter_Page || ''
                };
            },
            error: () => {
                this.loadingContactInfo = false;
            }
        });

        this.subscriptions.push(sub);
    }

    loadPreferences(): void {
        if (!this.currentUserId) {
            return;
        }

        this.loadingPreferences = true;
        const sub = this.profileApiService.getUserPreferences(this.currentUserId).subscribe({
            next: (response: any) => {
                this.loadingPreferences = false;
                if (!response?.success) {
                    return;
                }

                console.log(response?.message);

                this.userPreferences = response?.message?.User_Preferences || {};

                // Build dynamic form for preferences
                const formControls: any = {};
                Object.keys(this.userPreferences).forEach(key => {
                    formControls[key] = [this.userPreferences[key], [Validators.required]];
                });
                this.preferencesForm = this.fb.group(formControls);
            },
            error: () => {
                this.loadingPreferences = false;
            }
        });

        this.subscriptions.push(sub);
    }

    loadProfilePicture(): void {
        if (!this.currentUserId) {
            return;
        }

        this.loadingProfilePicture = true;
        const sub = this.profileApiService.getProfilePicture(this.currentUserId).subscribe({
            next: (response: any) => {
                this.loadingProfilePicture = false;
                if (response?.success && response?.message) {
                    const pictureData = response.message;
                    if (pictureData?.Image && pictureData.Image.trim() !== '') {
                        const imageFormat = pictureData.Image_Format || 'png';
                        this.profilePictureUrl = `data:image/${imageFormat.toLowerCase()};base64,${pictureData.Image}`;
                        this.hasProfilePicture = true;
                    } else {
                        // Fallback to default avatar
                        this.profilePictureUrl = this.gender ? 'assets/media/avatar.png' : 'assets/media/female-avatar.png';
                        this.hasProfilePicture = false;
                    }
                } else {
                    // Fallback to default avatar
                    this.profilePictureUrl = this.gender ? 'assets/media/avatar.png' : 'assets/media/female-avatar.png';
                    this.hasProfilePicture = false;
                }
                // Sync profile picture with service and localStorage
                this.syncProfilePicture(this.profilePictureUrl);
            },
            error: () => {
                this.loadingProfilePicture = false;
                this.profilePictureUrl = this.gender ? 'assets/media/avatar.png' : 'assets/media/female-avatar.png';
                this.hasProfilePicture = false;
                // Sync profile picture with service and localStorage
                this.syncProfilePicture(this.profilePictureUrl);
            }
        });

        this.subscriptions.push(sub);
    }

    saveContactInfo(): void {
        if (!this.currentUserId) {
            return;
        }

        // if (this.contactInfoForm.invalid || this.savingContactInfo) {
        //     this.messageService.add({
        //         severity: 'warn',
        //         summary: 'Validation',
        //         detail: 'Please fill in all fields correctly.'
        //     });
        // }

        this.savingContactInfo = true;
        const { address, phoneNumbers, linkedinPage, facebookPage, instagramPage, twitterPage } = this.contactInfoForm.value;

        // Extract phone numbers from form array
        const phoneNumbersArray = phoneNumbers.map((phoneGroup: any) => phoneGroup.number).filter((phone: string) => phone && phone.trim() !== '');

        const sub = this.profileApiService.updateUserContactInfo(
            this.currentUserId,
            address?.trim() || '',
            this.isRegional,
            phoneNumbersArray,
            linkedinPage?.trim() || '',
            facebookPage?.trim() || '',
            instagramPage?.trim() || '',
            twitterPage?.trim() || ''
        ).subscribe({
            next: (response: any) => {
                this.savingContactInfo = false;
                if (!response?.success) {
                    this.handleBusinessError('contact', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Contact information updated successfully.'
                });

                this.loadContactInfo();
            },
            error: () => {
                this.savingContactInfo = false;
            }
        });

        this.subscriptions.push(sub);
    }

    savePreferences(): void {
        if (!this.currentUserId) {
            return;
        }

        if (this.preferencesForm.invalid || this.savingPreferences) {
            return;
        }

        this.savingPreferences = true;
        const preferences: Record<string, string> = {};
        Object.keys(this.preferencesForm.controls).forEach(key => {
            preferences[key] = this.preferencesForm.get(key)?.value || '';
        });

        const sub = this.profileApiService.setUserPreferences(this.currentUserId, preferences).subscribe({
            next: (response: any) => {
                this.savingPreferences = false;
                if (!response?.success) {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to update preferences.'
                    });
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Preferences updated successfully.'
                });

                this.loadPreferences();
            },
            error: () => {
                this.savingPreferences = false;
            }
        });

        this.subscriptions.push(sub);
    }

    getDefaultAvatarUrl(): string {
        return this.gender ? 'assets/media/avatar.png' : 'assets/media/female-avatar.png';
    }

    onProfilePictureAreaClick(): void {
        if (this.uploadingPicture) {
            return;
        }
        this.profilePictureUploader?.choose();
    }

    onProfilePictureKeydown(event: KeyboardEvent | Event): void {
        event.preventDefault();
        this.onProfilePictureAreaClick();
    }

    uploadProfilePicture(event: any): void {
        if (!this.currentUserId) {
            return;
        }

        const file = event.files?.[0];
        if (!file) {
            return;
        }

        // Validate file type
        const validFormats = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'pict'];
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        if (!validFormats.includes(fileExtension)) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid image format. Allowed formats: PNG, JPG, JPEG, GIF, BMP, TIFF, PICT'
            });
            this.profilePictureUploader?.clear();
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2097152) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Image size must be less than 2MB.'
            });
            this.profilePictureUploader?.clear();
            return;
        }

        // Warn when file is over 1 MB (show in toaster)
        const oneMB = 1024 * 1024;
        if (file.size > oneMB) {
            this.messageService.add({
                severity: 'warn',
                summary: this.translate.getInstant('profile.edit.largeFile'),
                detail: this.translate.getInstant('profile.edit.largeFileDetail'),
                life: 5000
            });
        }

        // Open crop dialog so user can position photo (focus on head) before upload
        this.pendingCropFile = file;
        this.pendingCropFileExtension = fileExtension;
        const reader = new FileReader();
        reader.onload = () => {
            this.pendingCropDataUrl = reader.result as string;
            this.cropPosition = { x: 0, y: 0 };
            this.cropDisplayWidth = 200;
            this.cropDisplayHeight = 200;
            this.showCropDialog = true;
        };
        reader.onerror = () => {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to read file. Please try again.',
                life: 5000
            });
            this.profilePictureUploader?.clear();
        };
        reader.readAsDataURL(file);
        this.profilePictureUploader?.clear();
    }

    onCropImageLoad(event: Event): void {
        const img = event.target as HTMLImageElement;
        if (!img?.naturalWidth) return;
        this.cropNaturalWidth = img.naturalWidth;
        this.cropNaturalHeight = img.naturalHeight;
        const size = 200;
        const scale = size / Math.min(img.naturalWidth, img.naturalHeight);
        this.cropDisplayWidth = Math.round(img.naturalWidth * scale);
        this.cropDisplayHeight = Math.round(img.naturalHeight * scale);
        this.cropPosition = {
            x: (size - this.cropDisplayWidth) / 2,
            y: (size - this.cropDisplayHeight) / 2
        };
    }

    onCropMouseDown(event: MouseEvent): void {
        this.isCropDragging = true;
        this.lastCropMouseX = event.clientX;
        this.lastCropMouseY = event.clientY;
    }

    onCropMouseMove(event: MouseEvent): void {
        if (!this.isCropDragging) return;
        const dx = event.clientX - this.lastCropMouseX;
        const dy = event.clientY - this.lastCropMouseY;
        this.lastCropMouseX = event.clientX;
        this.lastCropMouseY = event.clientY;
        const size = 200;
        const maxX = 0;
        const minX = size - this.cropDisplayWidth;
        const maxY = 0;
        const minY = size - this.cropDisplayHeight;
        this.cropPosition.x = Math.max(minX, Math.min(maxX, this.cropPosition.x + dx));
        this.cropPosition.y = Math.max(minY, Math.min(maxY, this.cropPosition.y + dy));
    }

    onCropMouseUp(): void {
        this.isCropDragging = false;
    }

    closeCropDialog(): void {
        this.showCropDialog = false;
        this.pendingCropDataUrl = '';
        this.pendingCropFile = null;
    }

    onCropDialogHide(): void {
        this.closeCropDialog();
    }

    applyCropAndUpload(): void {
        const img = this.cropImageRef?.nativeElement as HTMLImageElement | undefined;
        if (!img || !this.pendingCropDataUrl || !this.currentUserId) {
            return;
        }
        const size = 200;
        const ctx = document.createElement('canvas').getContext('2d');
        if (!ctx) return;
        const canvas = ctx.canvas;
        canvas.width = size;
        canvas.height = size;
        const x = this.cropPosition.x;
        const y = this.cropPosition.y;
        const dw = this.cropDisplayWidth;
        const dh = this.cropDisplayHeight;
        const nw = this.cropNaturalWidth;
        const nh = this.cropNaturalHeight;
        const sx = (-x / dw) * nw;
        const sy = (-y / dh) * nh;
        const sw = (size / dw) * nw;
        const sh = (size / dh) * nh;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/png');
        const base64String = dataUrl.split(',')[1];
        if (!base64String) return;
        this.uploadingPicture = true;
        this.closeCropDialog();
        const sub = this.profileApiService.assignProfilePicture(this.currentUserId, 'png', base64String).subscribe({
            next: (response: any) => {
                this.uploadingPicture = false;
                if (!response?.success) {
                    this.handleBusinessError('picture', response);
                    this.profilePictureUploader?.clear();
                    return;
                }
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Profile picture updated successfully.',
                    life: 3000
                });
                this.loadProfilePicture();
            },
            error: () => {
                this.uploadingPicture = false;
                this.profilePictureUploader?.clear();
            }
        });
        this.subscriptions.push(sub);
    }

    removeProfilePicture(): void {
        if (!this.currentUserId) {
            return;
        }

        this.uploadingPicture = true;
        const sub = this.profileApiService.removeProfilePicture(this.currentUserId).subscribe({
            next: (response: any) => {
                this.uploadingPicture = false;
                if (!response?.success) {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to remove profile picture.'
                    });
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Profile picture removed successfully.'
                });

                this.profilePictureUrl = this.gender ? 'assets/media/avatar.png' : 'assets/media/female-avatar.png';
                this.hasProfilePicture = false;
                // Sync profile picture with service and localStorage
                this.syncProfilePicture(this.profilePictureUrl);
            },
            error: () => {
                this.uploadingPicture = false;
            }
        });

        this.subscriptions.push(sub);
    }

    addPreference(): void {
        const key = prompt('Enter preference key:');
        if (key && key.trim()) {
            this.preferencesForm.addControl(key.trim(), this.fb.control('', [Validators.required]));
            this.userPreferences[key.trim()] = '';
        }
    }

    removePreference(key: string): void {
        if (confirm(`Remove preference "${key}"?`)) {
            this.preferencesForm.removeControl(key);
            delete this.userPreferences[key];
        }
    }

    getPreferenceKeys(): string[] {
        return Object.keys(this.preferencesForm.controls);
    }

    getPhoneNumberError(index: number): string {
        const phoneControl = this.phoneNumbersFormArray.at(index)?.get('number');
        if (phoneControl?.errors?.['required']) {
            return 'Phone number is required.';
        }
        if (phoneControl?.errors?.['pattern']) {
            return 'Please enter a valid phone number.';
        }
        return '';
    }

    getFirstNameError(): string {
        return getNameFieldError(this.profileForm.get('First_Name'), 'First name', false);
    }

    getLastNameError(): string {
        return getNameFieldError(this.profileForm.get('Last_Name'), 'Last name', false);
    }

    getMiddleNameError(): string {
        return getNameFieldError(this.profileForm.get('Middle_Name'), 'Middle name', false);
    }

    getPrefixError(): string {
        return getTextFieldError(this.profileForm.get('Prefix'), 'Prefix', false);
    }

    getAddressError(): string {
        return getTextFieldError(this.contactInfoForm.get('address'), 'Address', false);
    }

    navigateBack(): void {
        this.router.navigate(['/summary/profile']);
    }

    /**
     * Sync user name with UserNameService and update localStorage
     * This ensures all components (top bar) are updated in real-time
     */
    private syncUserName(): void {
        if (!this.userDetails) return;

        const isRegional = this.accountSettings?.Language !== 'English';
        let displayName = '';

        if (isRegional) {
            const firstNameRegional = this.userDetails.First_Name_Regional || '';
            const lastNameRegional = this.userDetails.Last_Name_Regional || '';
            displayName = (firstNameRegional + ' ' + lastNameRegional).trim();
        }

        const firstNameEnglish = this.userDetails.First_Name || '';
        const lastNameEnglish = this.userDetails.Last_Name || '';
        const englishName = (firstNameEnglish + ' ' + lastNameEnglish).trim();

        if (isRegional && displayName) {
            this.userNameService.updateUserName(displayName);
        } else if (englishName) {
            this.userNameService.updateUserName(englishName);
        } else {
            this.userNameService.updateUserName(this.accountDetails?.Email || 'User');
        }

        console.log('ProfileEdit: syncUserName called, userDetails:', this.userDetails);

        // Update localStorage to persist the changes
        this.localStorageService.setItem('User_Details', this.userDetails);
    }

    /**
     * Sync profile picture with ProfilePictureService and update localStorage
     * This ensures all components (top bar, menu profile) are updated in real-time
     */
    private syncProfilePicture(pictureUrl: string): void {
        // Update the service to notify all subscribers (top bar, menu profile)
        this.profilePictureService.updateProfilePicture(pictureUrl);

        // Update localStorage so the picture persists across page reloads
        if (this.accountDetails) {
            // Store the picture URL in Account_Details.Profile_Picture
            this.accountDetails.Profile_Picture = pictureUrl;
            this.localStorageService.setItem('Account_Details', this.accountDetails);
        }
    }

    private handleBusinessError(context: ProfileContext, response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'update':
                detail = this.getUpdateErrorMessage(code) || '';
                break;
            case 'contact':
                detail = this.getContactErrorMessage(code) || '';
                break;
            case 'preferences':
                // Preferences errors are handled inline
                return null;
            case 'picture':
                detail = this.getPictureErrorMessage(code) || '';
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
        return null;
    }

    private getUpdateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11190':
                return 'Invalid User ID';
            case 'ERP11180':
                return 'Invalid format for First Name';
            case 'ERP11181':
                return 'Invalid format for Last Name';
            case 'ERP11182':
                return 'Invalid format for Middle Name';
            case 'ERP11183':
                return 'Invalid format for Prefix';
            default:
                return null;
        }
    }

    private getContactErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11190':
                return 'Invalid User ID';
            case 'ERP11191':
                return 'Invalid format for one or more of the Phone Numbers';
            case 'ERP11192':
                return 'Invalid link for the LinkedIn Page';
            case 'ERP11193':
                return 'Invalid link for the Facebook Page';
            case 'ERP11194':
                return 'Invalid link for the Instagram Page';
            case 'ERP11195':
                return 'Invalid link for the Twitter Page';
            default:
                return null;
        }
    }

    private getPictureErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11220':
                return 'Invalid Image Format';
            case 'ERP11221':
                return 'Invalid Image Size';
            default:
                return null;
        }
    }
}

