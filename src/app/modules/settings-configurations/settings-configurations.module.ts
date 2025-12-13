import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { SettingsConfigurationsRoutingModule } from './settings-configurations-routing.module';

// Function Components
import { FunctionsListComponent } from './components/Function/functions-list/functions-list.component';
import { FunctionFormComponent } from './components/Function/function-form/function-form.component';
import { FunctionDetailsComponent } from './components/Function/function-details/function-details.component';
import { FunctionLogoComponent } from './components/Function/function-logo/function-logo.component';

// Module Components
import { ModulesListComponent } from './components/Module/modules-list/modules-list.component';
import { ModuleFormComponent } from './components/Module/module-form/module-form.component';
import { ModuleDetailsComponent } from './components/Module/module-details/module-details.component';
import { ModuleLogoComponent } from './components/Module/module-logo/module-logo.component';

@NgModule({
    declarations: [
        // Function Components
        FunctionsListComponent,
        FunctionFormComponent,
        FunctionDetailsComponent,
        FunctionLogoComponent,
        // Module Components
        ModulesListComponent,
        ModuleFormComponent,
        ModuleDetailsComponent,
        ModuleLogoComponent,
    ],
    imports: [
        SettingsConfigurationsRoutingModule,
        SharedModule,
    ],
    providers: [MessageService]
})
export class SettingsConfigurationsModule { }
