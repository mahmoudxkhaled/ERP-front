import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ErrorHandlingInterceptor } from './core/Interceptors/error-handling.interceptor';
import { LoadingInterceptor } from './core/Interceptors/LoadingInterceptor';
import { SafePipe } from './core/pipes/safe.pipe';
import { AppLayoutModule } from './layout/app-layout/app.layout.module';
import { AppTranslateModule } from './Shared/shared/app-translate.module';
import { SharedModule } from './Shared/shared/shared.module';
@NgModule({
    declarations: [AppComponent, SafePipe],
    imports: [
        CommonModule,
        HttpClientModule,
        AppRoutingModule,
        AppLayoutModule,
        DialogModule,
        DynamicDialogModule,
        TranslateModule,
        AppTranslateModule.forRoot(),
        SharedModule,
    ],
    providers: [
        DialogService,
        MessageService,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: ErrorHandlingInterceptor,
            multi: true,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: LoadingInterceptor,
            multi: true,
        },
    ],
    bootstrap: [AppComponent],
    exports: [SafePipe]

})
export class AppModule { }
