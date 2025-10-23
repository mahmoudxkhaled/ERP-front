import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

@NgModule({
    imports: [RouterModule.forChild([
        { path: 'error', loadChildren: () => import('./error/error.module').then(m => m.ErrorModule) },
        { path: 'error2', loadChildren: () => import('./error2/error2.module').then(m => m.Error2Module) },
        { path: 'access', loadChildren: () => import('./accessdenied/accessdenied.module').then(m => m.AccessdeniedModule) },
        { path: 'access2', loadChildren: () => import('./accessdenied2/accessdenied2.module').then(m => m.Accessdenied2Module) },
        { path: 'login', loadChildren: () => import('./login/login.module').then(m => m.LoginModule) },
        { path: 'login2', loadChildren: () => import('./login2/login2.module').then(m => m.Login2Module) },
        { path: '**', redirectTo: '/notfound' }
    ])],
    exports: [RouterModule]
})
export class AuthRoutingModule { }
