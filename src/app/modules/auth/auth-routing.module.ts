import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { VerificationEmailComponent } from './components/verification-email/verification-email.component';
import { EmailVerifiedComponent } from './components/email-verified/email-verified.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { ForgetPasswordComponent } from './components/forget-password/forget-password.component';
import { VerifyCodeComponent } from './components/verify-code/verify-code.component';
import { AccountLockedComponent } from './components/account-locked/account-locked.component';

const routes: Routes = [
    { path: '', component: LoginComponent },
    // Email verification routes - supports both query params and route params for backward compatibility
    { path: 'email-verified', component: EmailVerifiedComponent }, // Primary route with query param: ?email=XYZ (for "Verify" case from login)
    { path: 'emailVerified/:email', component: EmailVerifiedComponent }, // Backward compatibility with route param
    { path: 'verify-email', component: VerificationEmailComponent }, // Route for email verification with token: ?token=XYZ
    { path: 'verification-email', component: VerificationEmailComponent }, // Alternative route for verification
    // Reset password routes - supports both query params and route params for backward compatibility
    // { path: 'resetPassword/:email', component: ResetPasswordComponent }, // Backward compatibility
    { path: 'reset-password', component: ResetPasswordComponent }, // Primary route with query param: ?resetToken=ABC
    { path: 'forget-password', component: ForgetPasswordComponent },
    { path: 'verify-code', component: VerifyCodeComponent },
    { path: 'account-locked', component: AccountLockedComponent },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AuthRoutingModule { }
