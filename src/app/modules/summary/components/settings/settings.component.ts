import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/Services/translation.service';
import { SettingsService } from './services/settings.service';
import { UserSettings } from './models/settings.model';

@Component({
    selector: 'app-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss'],
    providers: [MessageService]
})
export class SettingsComponent implements OnInit {

    // General Settings
    selectedLanguage: string = 'en';
    selectedTheme: string = 'light';
    selectedTimezone: string = 'UTC';

    // Notifications
    emailNotifications: boolean = true;
    pushNotifications: boolean = true;
    smsNotifications: boolean = false;

    // Security
    twoFactorAuth: boolean = false;
    selectedSessionTimeout: string = '30';
    autoLogout: boolean = true;

    // Privacy
    profileVisibility: boolean = true;
    analyticsTracking: boolean = true;
    selectedDataRetention: string = '1year';

    // Options
    languageOptions = [
        { label: 'English', value: 'en' },
        { label: 'العربية', value: 'ar' }
    ];

    themeOptions = [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' }
    ];

    timezoneOptions = [
        { label: 'UTC', value: 'UTC' },
        { label: 'GMT+1 (Europe/London)', value: 'GMT+1' },
        { label: 'GMT+2 (Europe/Berlin)', value: 'GMT+2' },
        { label: 'GMT+3 (Asia/Dubai)', value: 'GMT+3' },
        { label: 'GMT-5 (America/New_York)', value: 'GMT-5' }
    ];

    sessionTimeoutOptions = [
        { label: '15 minutes', value: '15' },
        { label: '30 minutes', value: '30' },
        { label: '1 hour', value: '60' },
        { label: '2 hours', value: '120' },
        { label: '4 hours', value: '240' }
    ];

    dataRetentionOptions = [
        { label: '6 months', value: '6months' },
        { label: '1 year', value: '1year' },
        { label: '2 years', value: '2years' },
        { label: '5 years', value: '5years' },
        { label: 'Indefinitely', value: 'indefinite' }
    ];

    constructor(
        public translate: TranslationService,
        private messageService: MessageService
    ) { }

    ngOnInit(): void {
        this.loadSettings();
    }

    loadSettings(): void {
        // Load settings from localStorage or API
        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            this.selectedLanguage = settings.language || 'en';
            this.selectedTheme = settings.theme || 'light';
            this.selectedTimezone = settings.timezone || 'UTC';
            this.emailNotifications = settings.emailNotifications !== false;
            this.pushNotifications = settings.pushNotifications !== false;
            this.smsNotifications = settings.smsNotifications || false;
            this.twoFactorAuth = settings.twoFactorAuth || false;
            this.selectedSessionTimeout = settings.sessionTimeout || '30';
            this.autoLogout = settings.autoLogout !== false;
            this.profileVisibility = settings.profileVisibility !== false;
            this.analyticsTracking = settings.analyticsTracking !== false;
            this.selectedDataRetention = settings.dataRetention || '1year';
        }
    }

    saveSettings(): void {
        const settings = {
            language: this.selectedLanguage,
            theme: this.selectedTheme,
            timezone: this.selectedTimezone,
            emailNotifications: this.emailNotifications,
            pushNotifications: this.pushNotifications,
            smsNotifications: this.smsNotifications,
            twoFactorAuth: this.twoFactorAuth,
            sessionTimeout: this.selectedSessionTimeout,
            autoLogout: this.autoLogout,
            profileVisibility: this.profileVisibility,
            analyticsTracking: this.analyticsTracking,
            dataRetention: this.selectedDataRetention
        };

        // Save to localStorage
        localStorage.setItem('userSettings', JSON.stringify(settings));

        // Show success message
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('shared.messages.success'),
            detail: this.translate.getInstant('settings.messages.saveSuccess'),
            life: 3000
        });

        // Apply theme change immediately
        this.applyTheme();
    }

    resetSettings(): void {
        // Reset to default values
        this.selectedLanguage = 'en';
        this.selectedTheme = 'light';
        this.selectedTimezone = 'UTC';
        this.emailNotifications = true;
        this.pushNotifications = true;
        this.smsNotifications = false;
        this.twoFactorAuth = false;
        this.selectedSessionTimeout = '30';
        this.autoLogout = true;
        this.profileVisibility = true;
        this.analyticsTracking = true;
        this.selectedDataRetention = '1year';

        this.messageService.add({
            severity: 'info',
            summary: this.translate.getInstant('settings.actions.reset'),
            detail: this.translate.getInstant('settings.messages.resetInfo'),
            life: 3000
        });
    }

    cancelChanges(): void {
        // Reload settings from storage
        this.loadSettings();

        this.messageService.add({
            severity: 'info',
            summary: this.translate.getInstant('settings.actions.cancel'),
            detail: this.translate.getInstant('settings.messages.cancelInfo'),
            life: 3000
        });
    }

    applyTheme(): void {
        // Apply theme change to the application
        const body = document.body;
        if (this.selectedTheme === 'dark') {
            body.classList.add('dark-theme');
        } else {
            body.classList.remove('dark-theme');
        }
    }

    onLanguageChange(): void {
        // Handle language change
        this.translate.useLanguage(this.selectedLanguage);
    }

    onThemeChange(): void {
        // Apply theme immediately
        this.applyTheme();
    }
}
