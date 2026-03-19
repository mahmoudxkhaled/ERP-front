import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { EntitiesRoutingModule } from './entities-routing.module';
import { EntitiesComponentsModule } from './entities-components.module';

@NgModule({
    declarations: [],
    imports: [
        EntitiesRoutingModule,
        EntitiesComponentsModule
    ],
    providers: [MessageService],
    exports: [EntitiesComponentsModule]
})
export class EntitiesModule { }

