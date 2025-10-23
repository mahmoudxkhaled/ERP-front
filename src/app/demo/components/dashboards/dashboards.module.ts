import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardsRoutingModule } from './dashboards-routing.module';
import { EventService } from 'src/app/demo/service/event.service';

@NgModule({
    imports: [
        CommonModule,
        DashboardsRoutingModule
    ],
    providers: [EventService]
})
export class DashboardsModule { }
