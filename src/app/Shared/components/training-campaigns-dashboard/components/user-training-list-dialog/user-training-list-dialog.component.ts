import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CheckboxChangeEvent } from 'primeng/checkbox';
import { ExcelService } from 'src/app/core/Services/excel.service';
import { PdfService } from 'src/app/core/Services/pdf.service';
import { TableLoadingService } from 'src/app/core/Services/table-loading.service';
import { ITrainingCampaignUserModel } from 'src/app/modules/training-campaigns/models/ITrainingCampaignUserModel';

@Component({
  selector: 'app-user-training-list-dialog',
  templateUrl: './user-training-list-dialog.component.html',
  styleUrls: ['./user-training-list-dialog.component.scss']
})
export class UserTrainingListDialogComponent implements OnInit {

  @Input() campaignUsers: ITrainingCampaignUserModel[];
  @Input() filteredCampaignUsers: ITrainingCampaignUserModel[];
  @Input() dialogHeader: string;
  @Input() currentCampaignNameForReport: string;
  @Input() completedCampaignNameForReport: string;
  @Input() displayDialog: boolean;
  @Input() campaignType: 'current' | 'completed';
  @Input() userStatus: 'Completed' | 'Not Started' | 'In Progress' | 'Failed';
  @Output() onHide = new EventEmitter<void>();

  campaignUsersSelected: ITrainingCampaignUserModel[] = [];
  campaignForSelectedUser: ITrainingCampaignUserModel[] = [];
  checkboxStates: { [key: string]: boolean } = {};
  tableLoadingSpinner: boolean = true;
  isSelected: boolean = false;
  selectedUser: ITrainingCampaignUserModel = {
    userId: '',
    userName: '',
    userEmail: '',
    unitName: '',
    userImageUrl: '',
    name: '',
    startDate: new Date(),
    endDate: new Date(),
    lessonName: '',
    score: 0
  };

  constructor(
    private pdfService: PdfService,
    private excelService: ExcelService,
    private tableLoadingService: TableLoadingService) {
  }

  ngOnInit(): void {
    this.tableLoadingService.loading$.subscribe((isLoading) => {
      this.tableLoadingSpinner = isLoading;
    });
  }

  downloadCSV() {
    if (this.campaignType === 'current') {
      this.downloadCurrentSelectedUsersReportAsCSV();
    } else {
      this.downloadCompletedSelectedUsersReportAsCSV();
    }
  }

  downloadPDF() {
    if (this.campaignType === 'current') {
      this.downloadCurrentSelectedUsersReportAsPDF();
    } else {
      this.downloadCompletedSelectedUsersReportAsPDF();
    }
  }

  addToSelected(user: ITrainingCampaignUserModel) {
    this.checkboxStates[user.userId] = true;
    const allUserLessons = this.campaignUsers.filter(c => c.userId == user.userId)
    this.campaignUsersSelected.push(...allUserLessons);
  }

  removeFromSelected(user: ITrainingCampaignUserModel) {
    this.checkboxStates[user.userId] = false;
    this.campaignUsersSelected = this.campaignUsersSelected.filter((w) => w.userId !== user.userId);
  }

  toggleSelection(wall: any) {
    if (this.checkboxStates[wall.id]) {
      this.removeFromSelected(wall);
    } else {
      this.addToSelected(wall);
    }
  }

  addToselected(event: any, wall: any) {
    if (event.checked) {
      this.addToSelected(wall);
    } else {
      this.removeFromSelected(wall);
    }
  }

  addAllSelected(event: CheckboxChangeEvent) {
    if (event.checked) {
      this.campaignUsersSelected = [];
      this.campaignUsers.forEach((w) => {
        this.checkboxStates[w.userId] = true;
        this.campaignUsersSelected.push(w);
      });
    } else {
      this.campaignUsers.forEach((w) => {
        this.checkboxStates[w.userId] = false;
        this.campaignUsersSelected = this.campaignUsersSelected.filter((c) => c.userId !== w.userId);
      });
    }
  }

  downloadAllPDF(){
    const data = this.campaignUsers.map((w) => ({
      User: `${w.userName}\n${w.userEmail}`,
      TenantUnit: w.unitName || '',
      Campaign: `${w.name}\n\n${this.formatDate(w.startDate)} - ${this.formatDate(w.endDate)}` || '',
      Lesson: w.lessonName || '',
      ...(this.userStatus !== 'Not Started' && { Score: `${w.score ?? 0}%` }),
    }));

    const headers = [
      { header: 'User', dataKey: 'User' },
      { header: 'Department', dataKey: 'TenantUnit' },
      { header: 'Campaign', dataKey: 'Campaign' },
      { header: 'Lesson', dataKey: 'Lesson' },
      ...(this.userStatus !== 'Not Started' ? [{ header: 'Quiz Score', dataKey: 'Score' }] : []),
    ];
    this.pdfService.exportDataToPdfVI(data, `All ${this.userStatus} Users Report`, headers);
  }
  
  async downloadAllCSV(){
    const data = this.campaignUsers.map((w) => {
      return {
        User: `${w.userName}`,
        UserEmail: `${w.userEmail}`,
        TenantUnit: w.unitName,
        Campaign: `${w.name}`,
        CampaignStartDate: this.formatDate(w.startDate),
        CampaignEndDate: this.formatDate(w.endDate),
        Lesson: w.lessonName,
        ...(this.userStatus !== 'Not Started' && { Score: `${w.score ?? 0}%` }),
      };
    });
    const headers = [
      { header: 'User Name', dataKey: 'User' },
      { header: 'User Email', dataKey: 'UserEmail' },
      { header: 'Department', dataKey: 'TenantUnit' },
      { header: 'Campaign', dataKey: 'Campaign' },
      { header: 'Campaign StartDate', dataKey: 'CampaignStartDate' },
      { header: 'Campaign EndDate', dataKey: 'CampaignEndDate' },
      { header: 'Lesson', dataKey: 'Lesson' },
      ...(this.userStatus !== 'Not Started' ? [{ header: 'Quiz Score', dataKey: 'Score' }] : []),
    ];
    await this.excelService.exportExcelVI(data, `All ${this.userStatus} Users Report`, headers);
  }

  downloadCompletedSelectedUsersReportAsPDF() {
    const data = this.campaignForSelectedUser.map((w) => ({
      User: `${w.userName}\n${w.userEmail}`,
      TenantUnit: w.unitName || '',
      Campaign: `${w.name}\n\n${this.formatDate(w.startDate)} - ${this.formatDate(w.endDate)}` || '',
      Lesson: w.lessonName || '',
      ...(this.userStatus !== 'Not Started' && { Score: `${w.score ?? 0}%` }),
    }));

    const headers = [
      { header: 'User', dataKey: 'User' },
      { header: 'Department', dataKey: 'TenantUnit' },
      { header: 'Campaign', dataKey: 'Campaign' },
      { header: 'Lesson', dataKey: 'Lesson' },
      ...(this.userStatus !== 'Not Started' ? [{ header: 'Quiz Score', dataKey: 'Score' }] : []),
    ];
    this.pdfService.exportDataToPdfVI(data, `${this.selectedUser.userName} ${this.userStatus} Report`, headers);
  }

  async downloadCompletedSelectedUsersReportAsCSV() {
    const data = this.campaignForSelectedUser.map((w) => {
      return {
        User: `${w.userName}`,
        UserEmail: `${w.userEmail}`,
        TenantUnit: w.unitName,
        Campaign: `${w.name}`,
        CampaignStartDate: this.formatDate(w.startDate),
        CampaignEndDate: this.formatDate(w.endDate),
        Lesson: w.lessonName,
        ...(this.userStatus !== 'Not Started' && { Score: `${w.score ?? 0}%` }),
      };
    });
    const headers = [
      { header: 'User Name', dataKey: 'User' },
      { header: 'User Email', dataKey: 'UserEmail' },
      { header: 'Department', dataKey: 'TenantUnit' },
      { header: 'Campaign', dataKey: 'Campaign' },
      { header: 'Campaign StartDate', dataKey: 'CampaignStartDate' },
      { header: 'Campaign EndDate', dataKey: 'CampaignEndDate' },
      { header: 'Lesson', dataKey: 'Lesson' },
      ...(this.userStatus !== 'Not Started' ? [{ header: 'Quiz Score', dataKey: 'Score' }] : []),
    ];
    await this.excelService.exportExcelVI(data, `${this.selectedUser.userName} ${this.userStatus} Report`, headers);
  }

  downloadCurrentSelectedUsersReportAsPDF() {
    const data = this.campaignForSelectedUser.map((w) => ({
      User: `${w.userName}\n${w.userEmail}`,
      TenantUnit: w.unitName || '',
      Campaign: `${w.name}\n\n${this.formatDate(w.startDate)} - ${this.formatDate(w.endDate)}` || '',
      Lesson: w.lessonName || '',
      ...(this.userStatus !== 'Not Started' && { Score: `${w.score ?? 0}%` }),
    }));

    const headers = [
      { header: 'User', dataKey: 'User' },
      { header: 'Department', dataKey: 'TenantUnit' },
      { header: 'Campaign', dataKey: 'Campaign' },
      { header: 'Lesson', dataKey: 'Lesson' },
      ...(this.userStatus !== 'Not Started' ? [{ header: 'Quiz Score', dataKey: 'Score' }] : []),
    ];
    this.pdfService.exportDataToPdfVI(data, `${this.selectedUser.userName} ${this.userStatus} Report`, headers);
  }

  async downloadCurrentSelectedUsersReportAsCSV() {
    const data = this.campaignForSelectedUser.map((w) => {
      return {
        User: `${w.userName}`,
        UserEmail: `${w.userEmail}`,
        TenantUnit: w.unitName,
        Campaign: `${w.name}`,
        CampaignStartDate: this.formatDate(w.startDate),
        CampaignEndDate: this.formatDate(w.endDate),
        Lesson: w.lessonName,
        ...(this.userStatus !== 'Not Started' && { Score: `${w.score ?? 0}%` }),
      };
    });
    const headers = [
      { header: 'User Name', dataKey: 'User' },
      { header: 'User Email', dataKey: 'UserEmail' },
      { header: 'Department', dataKey: 'TenantUnit' },
      { header: 'Campaign', dataKey: 'Campaign' },
      { header: 'Campaign StartDate', dataKey: 'CampaignStartDate' },
      { header: 'Campaign EndDate', dataKey: 'CampaignEndDate' },
      { header: 'Lesson', dataKey: 'Lesson' },
      ...(this.userStatus !== 'Not Started' ? [{ header: 'Quiz Score', dataKey: 'Score' }] : []),
    ];
    await this.excelService.exportExcelVI(data, `${this.selectedUser.userName} ${this.userStatus} Report`, headers);
  }

  formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Intl.DateTimeFormat('en-US', options).format(new Date(date));
  }

  selectUser(user: ITrainingCampaignUserModel) {
    this.selectedUser = user;
    this.checkboxStates = {};
    this.campaignUsers.forEach(user => {
      this.checkboxStates[user.userId] = false;
    });
    this.isSelected = false;
    this.campaignForSelectedUser = []
    this.campaignForSelectedUser = this.campaignUsers.filter(u => u.userId == user.userId)
  }

  handleHideAndClearSelections(): void {
    this.campaignForSelectedUser = [];
    this.campaignUsersSelected = [];
    this.campaignUsers = [];
    this.filteredCampaignUsers = [];
    this.checkboxStates = {};
    this.onHide.emit();
  }
}