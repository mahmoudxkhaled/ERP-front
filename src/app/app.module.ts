import { NgModule } from '@angular/core';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AppLayoutModule } from './layout/app-layout/app.layout.module';
import { authInterceptor } from './core/Interceptors/auth.interceptor';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { tokenInterceptor } from './core/Interceptors/token.interceptor';
import { MessageService } from 'primeng/api';
import { ErrorHandlingInterceptor } from './core/Interceptors/error-handling.interceptor';
import { SharedModule } from './Shared/shared/shared.module';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { environment } from 'src/environments/environment';
import { AppTranslateModule } from './Shared/shared/app-translate.module';
import { TranslateModule } from '@ngx-translate/core';
import { LoadingInterceptor } from './core/Interceptors/LoadingInterceptor';
import { SafePipe } from './core/pipes/safe.pipe';
import { DialogModule } from 'primeng/dialog';
import { SessionExpiredDialogComponent } from './Shared/components/session-expired-dialog/session-expired-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';
@NgModule({
    declarations: [AppComponent, SafePipe, SessionExpiredDialogComponent],
    imports: [
        HttpClientModule,
        AppRoutingModule,
        AppLayoutModule,
        DialogModule,
        TranslateModule,
        AppTranslateModule.forRoot(),
        SharedModule,
        MonacoEditorModule.forRoot({
            baseUrl: environment.assetsPath,
            defaultOptions: {
                language: 'html',
                scrollBeyondLastLine: false,
                minimap: {
                    enabled: false,
                },
                scrollbar: {
                    useShadows: true,
                    verticalHasArrows: false,
                    horizontalHasArrows: false,
                    vertical: 'visible',
                    verticalScrollbarSize: 12,
                    horizontalScrollbarSize: 12,
                    arrowSize: 30,
                },
                automaticLayout: true,
            },
        }),
    ],
    providers: [
        { provide: LocationStrategy, useClass: HashLocationStrategy },
        DialogService,
        // {
        //     provide: HTTP_INTERCEPTORS,
        //     useClass: authInterceptor,
        //     multi: true,
        // },
        // {
        //     provide: HTTP_INTERCEPTORS,
        //     useClass: tokenInterceptor,
        //     multi: true,
        // },
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
