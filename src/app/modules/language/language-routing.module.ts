import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LanguageListingComponent } from './components/language-listing/language-listing.component';

const routes: Routes = [
  { path: '', component: LanguageListingComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LanguageRoutingModule { }
