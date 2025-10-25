import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxIntlTelInputModule } from '@justin-s/ngx-intl-tel-input';
import { TranslateModule } from '@ngx-translate/core';
import { NgxEditorModule } from 'ngx-editor';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { AccordionModule } from 'primeng/accordion';
import { AnimateOnScrollModule } from 'primeng/animateonscroll';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { CarouselModule } from 'primeng/carousel';
import { ChartModule } from 'primeng/chart';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DataViewModule } from 'primeng/dataview';
import { DeferModule } from 'primeng/defer';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DropdownModule } from 'primeng/dropdown';
import { EditorModule } from 'primeng/editor';
import { FieldsetModule } from 'primeng/fieldset';
import { FileUploadModule } from 'primeng/fileupload';
import { GalleriaModule } from 'primeng/galleria';
import { ImageModule } from 'primeng/image';
import { InplaceModule } from 'primeng/inplace';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ListboxModule } from 'primeng/listbox';
import { MenuModule } from 'primeng/menu';
import { MessageModule } from 'primeng/message';
import { MessagesModule } from 'primeng/messages';
import { MultiSelectModule } from 'primeng/multiselect';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { PaginatorModule } from 'primeng/paginator';
import { PanelModule } from 'primeng/panel';
import { PasswordModule } from 'primeng/password';
import { PickListModule } from 'primeng/picklist';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RadioButtonModule } from 'primeng/radiobutton';
import { RatingModule } from 'primeng/rating';
import { RippleModule } from 'primeng/ripple';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SidebarModule } from 'primeng/sidebar';
import { SkeletonModule } from 'primeng/skeleton';
import { SpeedDialModule } from 'primeng/speeddial';
import { SplitterModule } from 'primeng/splitter';
import { StepsModule } from 'primeng/steps';
import { TableModule } from 'primeng/table';
import { TabMenuModule } from 'primeng/tabmenu';
import { TabViewModule } from 'primeng/tabview';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { TreeModule } from 'primeng/tree';
import { TreeTableModule } from 'primeng/treetable';
import { AppConfigModule } from 'src/app/layout/config/app.config.module';
import { ColorScemaSettingsComponent } from '../components/color-scema-settings/color-scema-settings.component';
import { EmptyDataComponent } from '../components/empty-data/empty-data.component';
import { IAwareInfoComponent } from '../components/iAware-info/iAware-info.component';
import { IAwareRichTextComponent } from '../components/iAware-rich-text/iAware-rich-text.component';
import { IAwareVariablesComponent } from '../components/iaware-variables/iaware-variables.component';
import { LogoutComponent } from '../components/logout/logout.component';
import { TableLoadingSpinnerComponent } from '../components/table-loading-spinner/table-loading-spinner/table-loading-spinner.component';
import { MockCredentialsComponent } from '../components/mock-credentials/mock-credentials.component';
import { InputMaskModule } from 'primeng/inputmask';
const components = [
    EmptyDataComponent,
    IAwareRichTextComponent,
    ColorScemaSettingsComponent,
    TableLoadingSpinnerComponent,
    LogoutComponent,
    IAwareInfoComponent,
    IAwareVariablesComponent,
    MockCredentialsComponent,
];

const imports = [
    InputMaskModule,
    SkeletonModule,
    TableModule,
    FormsModule,
    ButtonModule,
    DropdownModule,
    FileUploadModule,
    InputTextareaModule,
    InputGroupModule,
    InputGroupAddonModule,
    MultiSelectModule,
    DialogModule,
    ToolbarModule,
    ToastModule,
    CheckboxModule,
    RatingModule,
    RadioButtonModule,
    InputNumberModule,
    InputSwitchModule,
    MessagesModule,
    CalendarModule,
    MessageModule,
    EditorModule,
    DividerModule,
    GalleriaModule,
    AppConfigModule,
    TableModule,
    ProgressBarModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    TabViewModule,
    RippleModule,
    InputTextModule,
    ConfirmDialogModule,
    DropdownModule,
    FileUploadModule,
    ColorPickerModule,
    ImageModule,
    StepsModule,
    CardModule,
    PickListModule,
    TreeModule,
    NgxEditorModule,
    TabMenuModule,
    ListboxModule,
    TreeTableModule,
    ToggleButtonModule,
    ToggleButtonModule,
    DataViewModule,
    SpeedDialModule,
    PanelModule,
    MenuModule,
    InplaceModule,
    ProgressSpinnerModule,
    FieldsetModule,
    TooltipModule,
    SidebarModule,
    OverlayPanelModule,
    AvatarModule,
    ChartModule,
    ScrollPanelModule,
    PasswordModule,
    MonacoEditorModule,
    TranslateModule,
    CarouselModule,
    TagModule,
    SplitterModule,
    NgxIntlTelInputModule,
    AnimateOnScrollModule,
    ListboxModule,
    DeferModule,
    SelectButtonModule,
    ChipModule,
    AutoCompleteModule,
    AccordionModule,
    PaginatorModule
];

const providers = [ConfirmationService, MessageService];

@NgModule({
    declarations: [...components],
    imports: [...imports],
    exports: [...imports, ...components,],
    providers: [...providers],
})
export class SharedModule { }