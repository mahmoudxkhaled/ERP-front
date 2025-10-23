import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-email-verified',
    templateUrl: './email-verified.component.html',
    styleUrls: ['./email-verified.component.scss'],
})
export class EmailVerifiedComponent implements OnInit, OnDestroy {
    private unsubscribe: Subscription = new Subscription();

    constructor(
        private authService: AuthService,
        private route: ActivatedRoute,
        private router: Router,
        private messageService : MessageService
    ) {}

    ngOnInit(): void {
        this.unsubscribe = this.route.params.subscribe((params) => {
            const email = params['email'];
            this.authService.confirmEmail(email).subscribe({
                next: (data) => {
                    if (data) {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Email confirmed',
                            detail: 'Your email has been successfully confirmed. You can now log in now.',
                        })
                        setTimeout(()=>{
                            this.router.navigate(['/auth']);
                        }, 3000)
                    }
                }
            });
        });
    }

    ngOnDestroy(): void {
        this.unsubscribe.unsubscribe();
    }
}