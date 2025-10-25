import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinancialsRoutingModule } from './financials-routing.module';

// Components
import { InvoicesComponent } from './components/invoices/invoices.component';

@NgModule({
    declarations: [
        InvoicesComponent
    ],
    imports: [
        CommonModule,
        FinancialsRoutingModule
    ]
})
export class FinancialsModule { }
