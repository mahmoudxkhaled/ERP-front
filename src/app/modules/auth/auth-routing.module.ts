import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { VerificationEmailComponent } from './components/verification-email/verification-email.component';
import { EmailVerifiedComponent } from './components/email-verified/email-verified.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { ForgetPasswordComponent } from './components/forget-password/forget-password.component';
import { AccountStatusComponent } from './components/account-status/account-status.component';
import { Verify2FAComponent } from './components/verify-2fa/verify-2fa.component';

const routes: Routes = [
    { path: '', component: LoginComponent },

    { path: 'email-verified', component: EmailVerifiedComponent },

    { path: 'verify-email', component: VerificationEmailComponent },

    {
        path: ':type/reset-password',
        component: ResetPasswordComponent,
        data: { allowed: ['forgot-password', 'unlock-account', 'new-account'] }
    },
    {
        path: 'change-password',
        component: ResetPasswordComponent,
        data: { type: 'change-password' }
    },
    { path: 'reset-password', component: ResetPasswordComponent },
    { path: 'forget-password', component: ForgetPasswordComponent },
    { path: 'verify-2fa/:email', component: Verify2FAComponent },
    { path: 'account-status', component: AccountStatusComponent },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AuthRoutingModule { }
