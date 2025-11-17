import { Component, ElementRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { LayoutService } from '../app-services/app.layout.service';
import { Subscription } from 'rxjs';
import { LocalStorageService } from '../../core/Services/local-storage.service';
import { AuthService } from '../../modules/auth/services/auth.service';
import { TranslationService } from 'src/app/core/Services/translation.service';
import { LogoutComponent } from 'src/app/modules/auth/components/logout/logout.component';
import { DialogService } from 'primeng/dynamicdialog';

export interface GetUser {
    id: string;
    firstName: string;
    lastName: string;
    languageId: string;
    email: string;
    theme: string;
    photoUrl: string;
    iAwareTeam?: boolean;
}

@Component({
    selector: 'app-menu-profile',
    templateUrl: './app.menuprofile.component.html',
    animations: [
        trigger('menu', [
            transition('void => inline', [
                style({ height: 0 }),
                animate('400ms cubic-bezier(0.86, 0, 0.07, 1)', style({ opacity: 1, height: '*' })),
            ]),
            transition('inline => void', [
                animate('400ms cubic-bezier(0.86, 0, 0.07, 1)', style({ opacity: 0, height: '0' })),
            ]),
            transition('void => overlay', [
                style({ opacity: 0, transform: 'scaleY(0.8)' }),
                animate('.12s cubic-bezier(0, 0, 0.2, 1)'),
            ]),
            transition('overlay => void', [animate('.1s linear', style({ opacity: 0 }))]),
        ]),
    ],
})
export class AppMenuProfileComponent implements OnInit {
    isAdmin: boolean = false;
    userName: string = 'John Doe';
    imageUrl: string = '../../assets/media/avatar.png';
    subs: Subscription = new Subscription();
    user: GetUser;
    currentPages: any;
    showLogoutDialog: boolean = false; // Track logout dialog visibility

    constructor(
        public layoutService: LayoutService,
        public el: ElementRef,
        private localStorage: LocalStorageService,
        private translate: TranslationService,
        private authService: AuthService,
        private router: Router,
        private dialogService: DialogService
    ) {
        const userData = this.localStorage.getItem('userData');
        if (userData && userData.userImageUrl) {
            this.imageUrl = userData.userImageUrl;
        }
    }

    ngOnInit(): void {
        this.loadUser();

        // this.userProfilePhotoService.userPhoto$.subscribe((newPhotoUrl) => {
        //     this.imageUrl = newPhotoUrl ?? this.imageUrl;
        // });

        // this.userProfilePhotoService.userName$.subscribe((newName) => {
        //     this.userName = newName ?? this.userName;
        // });
    }

    loadUser() {
        this.subs.add(
            // this.userServ.getUserDetails().subscribe((res) => {
            //     this.user = res.data;
            //     if (res.data.userPhoto !== null || res.data.userPhoto !== undefined || res.data.userPhoto !== '') {
            //         this.imageUrl = res.data.userPhoto ?? this.imageUrl;
            //         this.userName = res.data.fullName;
            //     }
            // })
        );
    }

    toggleMenu() {
        this.layoutService.onMenuProfileToggle();
    }

    get isHorizontal() {
        return this.layoutService.isHorizontal() && this.layoutService.isDesktop();
    }

    get menuProfileActive(): boolean {
        return this.layoutService.state.menuProfileActive;
    }

    get menuProfilePosition(): string {
        return this.layoutService.config().menuProfilePosition;
    }

    get isTooltipDisabled(): boolean {
        return !this.layoutService.isSlim();
    }

    hassPermession(pageName: string): boolean {
        return this.currentPages.includes(pageName);
    }

    logOut() {
        this.dialogService.open(LogoutComponent, {
            showHeader: true,
            header: this.translate.getInstant('shared.headers.confirmLogout'),
            styleClass: 'custom-dialog',
            maskStyleClass: 'custom-backdrop',
            dismissableMask: true,
            width: '30vw',
            closable: true,
        });
    }
}