import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Chart } from 'chart.js';
import { PrimeNGConfig } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LanguageDIRService } from './core/Services/LanguageDIR.service';
import { LocalStorageService } from './core/Services/local-storage.service';
import { TranslationService } from './core/Services/translation.service';
import { LayoutService } from './layout/app-services/app.layout.service';
import { NetworkStatusService } from './core/Services/network-status.service';
import { Router } from '@angular/router';
import { AuthService } from './modules/auth/services/auth.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {
    constructor(
        private primengConfig: PrimeNGConfig,
        private localStorage: LocalStorageService,
        private translationService: TranslationService,
        private rtlService: LanguageDIRService,
        private layoutService: LayoutService,
        private ref: ChangeDetectorRef,
        private networkStatusService: NetworkStatusService,
        private translate: TranslationService,
        private router: Router,
        private authService: AuthService
    ) {
        this.refreshLoginDataPackage();

        this.translationService.setDefaultLang('en');
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--primary-color');
        Chart.register({
            id: 'noDataPlugin',
            beforeDraw: (chart: any) => {
                const ctx = chart.ctx;
                const datasets = chart.data.datasets;
                const noData = datasets.every((dataset: any) => dataset.data.length === 0);

                if (noData) {
                    const width = chart.width;
                    const height = chart.height;
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = '16px sans-serif';
                    ctx.fillStyle = textColor;
                    ctx.fillText(this.translate.getInstant('shared.messages.noDataAvailable'), width / 2, height / 2);
                    ctx.restore();
                }
            },
        });
    }

    private rtlSubscription: Subscription;
    private languageSubscription: Subscription;

    isRtl = false;
    userLanguageCode: string | null = null;

    ngOnInit(): void {

        this.primengConfig.ripple = true;

        const userLangCode = this.rtlService.getLanguageFromStorage();

        this.translationService.useLanguage(userLangCode || 'en');

        this.isRtl = this.rtlService.getRtlFromStorage();

        this.rtlSubscription = this.rtlService.isRtl$.subscribe((isRtl) => {
            this.isRtl = isRtl;
            this.ref.detectChanges(); // Manually trigger change detection
        });
        this.languageSubscription = this.rtlService.userLanguageCode$.subscribe((lang) => {
            this.translationService.useLanguage(lang);
            this.ref.detectChanges(); // Manually trigger change detection
        });

        // Call getLoginDataPackage on window reload if user is authenticated
    }

    /**
     * Refresh login data package on window reload
     * Only runs if user is authenticated (has access token)
     * Runs silently in the background without error handling
     */
    private refreshLoginDataPackage(): void {
        const accessToken = this.localStorage.getAccessToken();

        // Only proceed if user is authenticated
        if (accessToken) {
            const accountDetails = this.localStorage.getAccountDetails();
            const email = accountDetails?.Email;

            // Only call API if email is available
            if (email) {
                // Call silently in background - no error handling needed
                this.authService.getLoginDataPackage(email).subscribe({
                    next: () => {
                        // Silently refresh data - no action needed
                    },
                    error: () => {
                        // Silently fail - no error handling needed
                    }
                });
            }
        }
    }

    toggleDirection() {
        this.isRtl = !this.isRtl;
        this.rtlService.setRtl(this.isRtl);
        this.translationService.useLanguage(this.isRtl ? 'ar' : 'en');
    }

    ngOnDestroy(): void {
        this.rtlSubscription.unsubscribe();
        this.languageSubscription.unsubscribe();
    }
}

//#region will be used later
// arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
// westernNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
// convertNumerals(text: string, isRtl: boolean): string {
//     if (isRtl) {
//         return text.replace(/\d/g, (match) => this.arabicNumerals[parseInt(match)]);
//     } else {
//         return text.replace(
//             /[\u0660-\u0669]/g,
//             (match) => this.westernNumerals[this.arabicNumerals.indexOf(match)]
//         );
//     }
// }

// replaceAllNumerals() {
//     const bodyTextNodes = Array.from(document.body.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);

//     bodyTextNodes.forEach((textNode) => {
//         const textContent = textNode.textContent ?? '';
//         textNode.textContent = this.convertNumerals(textContent, this.isRtl);
//     });
// }

// changePaginator() {
//     // this.replaceAllNumerals();

//     const paginatorElements = document.querySelectorAll('.p-paginator-current');
//     paginatorElements.forEach((element) => {
//         if (this.isRtl) {
//             // element.textContent = this.convertNumerals(element.textContent ?? '', this.isRtl);

//             element.textContent = element.textContent?.replace('Showing ', ' عرض ') || 'عرض';
//             element.textContent = element.textContent?.replace('entries', 'إدخالات') || 'إدخالات';
//             element.textContent = element.textContent?.replace('to', 'إلى') || 'إلى';
//             element.textContent = element.textContent?.replace('of ', ' من ') || 'من';
//         } else {
//             // element.textContent = this.convertNumerals(element.textContent ?? '', this.isRtl);

//             element.textContent = element.textContent?.replace('عرض', 'Showing') || 'Showing';
//             element.textContent = element.textContent?.replace('إدخالات', 'entries') || 'entries';
//             element.textContent = element.textContent?.replace('إلى', 'to') || 'to';
//             element.textContent = element.textContent?.replace(' من', 'of ') || 'of';
//         }
//     });
// }
//#endregion
