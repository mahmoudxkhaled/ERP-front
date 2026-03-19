import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';

import { SystemEntitiesRoutingModule } from './system-entities-routing.module';
import { EntitiesComponentsModule } from 'src/app/modules/entity-administration/entities/entities-components.module';

@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        SystemEntitiesRoutingModule,
        EntitiesComponentsModule
    ],
    providers: [MessageService]
})
export class SystemEntitiesModule { }

