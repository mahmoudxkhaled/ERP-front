import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LanguageRoutingModule } from './language-routing.module';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { LanguageListingComponent } from './components/language-listing/language-listing.component';

@NgModule({
    declarations: [LanguageListingComponent],
    imports: [SharedModule, LanguageRoutingModule],
})
export class LanguageModule {}
