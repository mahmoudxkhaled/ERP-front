import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ExcelService } from 'src/app/core/Services/excel.service';
import { DropdownChangeEvent } from 'primeng/dropdown';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Chart, registerables } from 'chart.js';
import { PdfService } from 'src/app/core/Services/pdf.service';
import { IAwarenessCampaignDashboardModel } from 'src/app/modules/training-campaigns/models/IAwarenessCampaignDashboardModel';
import { IAwarenessCampaignTrainingModel } from 'src/app/modules/training-campaigns/models/IAwarenessCampaignTrainingModel';
import { ITrainingCampaignUserModel } from 'src/app/modules/training-campaigns/models/ITrainingCampaignUserModel';
import { CampaignService } from 'src/app/modules/training-campaigns/services/campaign.service';
import { CheckboxChangeEvent } from 'primeng/checkbox';
import { Table } from 'primeng/table';
import { ILeaderboardStatisticsModel } from 'src/app/modules/leaderboard/models/ILeaderboardStatisticsModel';
import { IAwarenessTrainingCampaignsTrendAnalysisModel } from 'src/app/modules/training-campaigns/models/IAwarenessTrainingCampaignsTrendAnalysisModel';
import { MessageService } from 'primeng/api';
import { TableLoadingService } from 'src/app/core/Services/table-loading.service';
import { TranslationService } from 'src/app/core/Services/translation.service';

@Component({
    selector: 'app-training-campaigns-dashboard',
    templateUrl: './training-campaigns-dashboard.component.html',
    styleUrl: './training-campaigns-dashboard.component.scss',
})
export class TrainingCampaignsDashboardComponent implements OnInit, OnDestroy {
    unsubscribe: Subscription[] = [];
    months: any[] = [];
    selectedMonth: number = 0;
    currentCampaignNameForReport: string = 'All [R] Training Campaigns';
    completedCampaignNameForReport: string = 'All [C] Training Campaigns';

    trainingAwarenessCampaigns: IAwarenessCampaignTrainingModel[] = [];
    trainingAwarenessCampaignsForDashboardDropDown: IAwarenessCampaignTrainingModel[] = [];
    historyCampaignsData: IAwarenessCampaignTrainingModel[] = [];
    historyCampaignsDataForDashboardDropDown: IAwarenessCampaignTrainingModel[] = [];

    campaignUsers: ITrainingCampaignUserModel[] = [];
    campaignUsersSelected: ITrainingCampaignUserModel[] = [];
    checkboxStates: { [key: string]: boolean } = {};

    displayCurrentCampaignCompletedDialog: boolean = false;
    displayCurrentCampaignNotStartedDialog: boolean = false;
    displayCurrentCampaignFailedDialog: boolean = false;
    displayCurrentCampaignInProgressDialog: boolean = false;
    currentCampaignDashboardId: string = 'all';
    currentCampaignsDashboard: IAwarenessCampaignDashboardModel = {
        completed: 0,
        notStarted: 0,
        inProgress: 0,
        failed: 0,
    };
    currentCampaignsDashboardPieChartOptions: any;
    currentCampaignsDashboardPiehartData: any;

    campaignsDashboardTrendAnalysisChartOptions: any;
    campaignsDashboardTrendAnalysisChartData: any;
    campaignsDashboardTrendAnalysisData: IAwarenessTrainingCampaignsTrendAnalysisModel = {
        actualData: [],
        labels: [],
        targetData: [],
    };

    displayCompletedCampaignCompletedDialog: boolean = false;
    displayCompletedCampaignFailedDialog: boolean = false;
    completedCampaignDashboardId: string = 'all';
    completedCampaignsDashboard: IAwarenessCampaignDashboardModel = {
        completed: 0,
        notStarted: 0,
        inProgress: 0,
        failed: 0,
    };
    completedCampaignsDashboardPieChartOptions: any;
    completedCampaignsDashboardPiehartData: any;

    leaderboardDataForUsers: ILeaderboardStatisticsModel = {
        rankedUsers: [],
        topThreeRankedUsers: [],
    };
    tableLoadingSpinner: boolean = true;

    constructor(
        private apiService: CampaignService,
        private pdfService: PdfService,
        private excelService: ExcelService,
        private messageService: MessageService,
        private tableLoadingService: TableLoadingService,
        private translate: TranslationService
    ) {
        Chart.register(...registerables, ChartDataLabels);
    }

    ngOnInit(): void {
        this.tableLoadingService.loading$.subscribe((isLoading) => {
            this.tableLoadingSpinner = isLoading;
        });
        this.fetchTrainingAwarenessCampaignsAdminDashboard();
        this.initCurrentCampaignsDashboardPieChartOptions();
        this.initCompletedCampaignsDashboardPieChartOptions();
        this.initCompletedCampaignsDashboardTrendAnalysisChartOptions();
        this.fetchCurrentCampaignsDashboard();
        this.fetchCompletedCampaignsDashboard();
        this.fetchCompletedCampaignsTrendAnalysisDashboard();
        this.fetchTrainingCampaignsLeaderboardData();
        this.months = [
            { id: 1, name: '1' },
            { id: 3, name: '3' },
            { id: 6, name: '6' },
            { id: 9, name: '9' },
        ];
    }

    fetchTrainingAwarenessCampaignsAdminDashboard() {
        const x = this.apiService.getAllTreainingAwarenessCampaignScheduleForAdminDashboard().subscribe({
            next: (res) => {
                const currentResult = res.data.currentCampaigns as IAwarenessCampaignTrainingModel[] ?? [];
                this.trainingAwarenessCampaignsForDashboardDropDown = currentResult.length > 0 ? [{ campaignName: 'All', campaignId: 'all' } as IAwarenessCampaignTrainingModel, ...new Map(currentResult.map((item: any) => [item.campaignId, item])).values(),] : [];

                const completedResult = res.data.completedCampaigns as IAwarenessCampaignTrainingModel[] ?? [];
                this.historyCampaignsDataForDashboardDropDown = completedResult.length > 0 ? [
                    { campaignName: 'All', campaignId: 'all' } as IAwarenessCampaignTrainingModel,
                    ...new Map(completedResult.map((item) => [item.campaignId, item])).values(),
                ] : [];
            },
            error: (err) => { },
        });
        this.unsubscribe.push(x);
    }

    fetchCurrentCampaignsDashboard() {
        this.apiService.getCurrentCampaignsDashboard(this.currentCampaignDashboardId).subscribe({
            next: (res) => {
                this.currentCampaignsDashboard = res.data;
                this.updateCurrentCampaignsDashboardPieChartData();
            },
            error: (err) => { },
        });
    }

    fetchCompletedCampaignsDashboard() {
        this.apiService.getCompletedCampaignsDashboard(this.completedCampaignDashboardId).subscribe({
            next: (res) => {
                this.completedCampaignsDashboard = res.data;
                this.updateCompletedCampaignsDashboardPieChartData();
            },
            error: (err) => { },
        });
    }

    fetchCompletedCampaignsTrendAnalysisDashboard() {
        this.apiService.getTrainingTrandAnalysis(this.selectedMonth).subscribe({
            next: (res) => {
                this.campaignsDashboardTrendAnalysisData = res.data;
                this.updateCompletedCampaignsDashboardTrendAnalysisChartData();
            },
            error: (err) => { },
        });
    }

    fetchTrainingCampaignsLeaderboardData() {
        this.apiService.getTrainingLeaderboard(this.currentCampaignDashboardId).subscribe({
            next: (res) => {
                this.leaderboardDataForUsers = res.data;
            },
            error: (err) => { },
        });
    }

    updateCurrentCampaignsDashboardPieChartData() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');

        if (
            this.currentCampaignsDashboard.completed === 0 &&
            this.currentCampaignsDashboard.notStarted === 0 &&
            this.currentCampaignsDashboard.inProgress === 0 &&
            this.currentCampaignsDashboard.failed === 0
        ) {
            this.currentCampaignsDashboardPiehartData = {
                labels: [this.translate.getInstant('shared.messages.noDataAvailable')],
                datasets: [
                    {
                        data: [100],
                        backgroundColor: [textColorSecondary],
                        hoverBackgroundColor: [textColorSecondary],
                    },
                ],
            };
        } else {
            this.currentCampaignsDashboardPiehartData = {
                labels: [
                    this.translate.getInstant('trainingCampaignsDashboard.completed'),
                    this.translate.getInstant('trainingCampaignsDashboard.notStarted'),
                    this.translate.getInstant('trainingCampaignsDashboard.inProgress'),
                    this.translate.getInstant('trainingCampaignsDashboard.failed'),
                ],
                datasets: [
                    {
                        data: [
                            this.currentCampaignsDashboard.completed,
                            this.currentCampaignsDashboard.notStarted,
                            this.currentCampaignsDashboard.inProgress,
                            this.currentCampaignsDashboard.failed,
                        ],
                        backgroundColor: ['#28a745', '#6c757d', '#ffc107', '#dc3545'],
                        hoverBackgroundColor: ['#218838', '#5a6268', '#ffc107', '#c82333'],
                    },
                ],
            };
        }
    }

    initCurrentCampaignsDashboardPieChartOptions() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--primary-color');

        this.currentCampaignsDashboardPieChartOptions = {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top', // Keeps legend at the top,
                    usePointStyle: true,
                    align: 'start',  // Ensures all items start at the same point (use 'end' for right alignment)
                    labels: {
                        usePointStyle: true, // Uses circular bullets instead of rectangles
                        boxWidth: 14, // Ensures uniform icon size
                        boxHeight: 14, // Ensures proper aspect ratio
                        padding: 10, // Adds spacing between legend items
                        textAlign: 'left', // Forces text alignment to start at the same point
                        fullSize: false, // Prevents stretching across the chart width
                        font: {
                            size: 14,
                            weight: 'bold', // Makes text clearer
                        },
                    },
                },
                tooltip: {
                    callbacks: {
                        label: (context: any) => {
                            const label = context.label;
                            if (label === this.translate.getInstant('shared.messages.noDataAvailable')) {
                                return '';
                            }
                            return `${label}: ${context.raw}`;
                        },
                    },
                },
                datalabels: {
                    formatter: (value: any, context: { dataIndex: number; chart: any }) => {
                        const label = context.chart.data.labels[context.dataIndex];
                        const numericValue = Number(value);
                        if (label === this.translate.getInstant('shared.messages.noDataAvailable')) {
                            return this.translate.getInstant('shared.messages.noDataAvailable');
                        }
                        if (!isNaN(numericValue) && numericValue !== 0) {
                            return `${numericValue}`;
                        }
                        return '';
                    },
                    color: '#fff',
                    font: {
                        size: 14,
                        weight: 'bold',
                    },
                    usePointStyle: true,
                    anchor: 'center',
                    align: 'center',
                    padding: {
                        left: 10,
                    },
                },
            },
            onClick: this.onCurrentCampaignSliceClick.bind(this),
            onHover: (event: any, chartElement: any) => {
                event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            },
        };
    }

    onCurrentCampaignSliceClick(event: any) {
        const activePoints = event.chart.getElementsAtEventForMode(event.native, 'nearest', { intersect: true }, false);
        this.currentCampaignNameForReport =
            this.trainingAwarenessCampaignsForDashboardDropDown.find(
                (c) => c.campaignId == this.currentCampaignDashboardId
            )?.campaignName ?? '';
        if (activePoints.length) {
            const chartElement = activePoints[0];
            const datasetIndex = chartElement.datasetIndex;
            const dataIndex = chartElement.index;
            const label = event.chart.data.labels[dataIndex];

            switch (label) {
                case this.translate.getInstant('trainingCampaignsDashboard.completed'):
                    this.displayCurrentCampaignCompletedDialog = true;
                    this.getGetCurrentAwarenessCampaignsUsersForDashboard('completed');
                    break;
                case this.translate.getInstant('trainingCampaignsDashboard.notStarted'):
                    this.getGetCurrentAwarenessCampaignsUsersForDashboard('notstarted');
                    this.displayCurrentCampaignNotStartedDialog = true;
                    break;
                case this.translate.getInstant('trainingCampaignsDashboard.inProgress'):
                    this.displayCurrentCampaignInProgressDialog = true;
                    this.getGetCurrentAwarenessCampaignsUsersForDashboard('inprogress');
                    break;
                case this.translate.getInstant('trainingCampaignsDashboard.failed'):
                    this.displayCurrentCampaignFailedDialog = true;
                    this.getGetCurrentAwarenessCampaignsUsersForDashboard('failed');
                    break;
                default:
                    break;
            }
        }
    }

    getGetCurrentAwarenessCampaignsUsersForDashboard(action: string) {
        this.tableLoadingService.show();
        this.apiService.getUsersByActionCurrentCampaignsDashboard(this.currentCampaignDashboardId, action).subscribe({
            next: (users) => {
                this.campaignUsers = [];
                this.campaignUsersSelected = [];
                this.campaignUsers = users.data;
                this.tableLoadingService.hide();
            },
            error: (error) => {
                console.error('Error fetching users by action:', error);
            },
        });
    }

    getGetCompletedAwarenessCampaignsUsersForDashboard(action: string) {
        this.tableLoadingService.show();
        this.apiService
            .getUsersByActionCompletedCampaignsDashboard(this.completedCampaignDashboardId, action)
            .subscribe({
                next: (users) => {
                    this.campaignUsers = [];
                    this.campaignUsersSelected = [];
                    this.campaignUsers = users.data;
                    this.tableLoadingService.hide();
                },
                error: (error) => {
                    console.error('Error fetching users by action:', error);
                },
            });
    }

    updateCompletedCampaignsDashboardPieChartData() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');

        if (this.completedCampaignsDashboard.completed === 0 && this.completedCampaignsDashboard.failed === 0) {
            this.completedCampaignsDashboardPiehartData = {
                labels: [this.translate.getInstant('shared.messages.noDataAvailable')],
                datasets: [
                    {
                        data: [100],
                        backgroundColor: [textColorSecondary],
                        hoverBackgroundColor: [textColorSecondary],
                    },
                ],
            };
        } else {
            this.completedCampaignsDashboardPiehartData = {
                labels: [
                    this.translate.getInstant('trainingCampaignsDashboard.completed'),
                    this.translate.getInstant('trainingCampaignsDashboard.failed'),
                ],
                datasets: [
                    {
                        data: [this.completedCampaignsDashboard.completed, this.completedCampaignsDashboard.failed],
                        backgroundColor: ['#28a745', '#dc3545'],
                        hoverBackgroundColor: ['#218838', '#c82333'],
                    },
                ],
            };
        }
    }

    initCompletedCampaignsDashboardPieChartOptions() {
        const documentStyle = getComputedStyle(document.documentElement);

        this.completedCampaignsDashboardPieChartOptions = {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top', // Keeps legend at the top,
                    usePointStyle: true,
                    align: 'start',  // Ensures all items start at the same point (use 'end' for right alignment)
                    labels: {
                        usePointStyle: true, // Uses circular bullets instead of rectangles
                        boxWidth: 14, // Ensures uniform icon size
                        boxHeight: 14, // Ensures proper aspect ratio
                        padding: 10, // Adds spacing between legend items
                        textAlign: 'left', // Forces text alignment to start at the same point
                        fullSize: false, // Prevents stretching across the chart width
                        font: {
                            size: 14,
                            weight: 'bold', // Makes text clearer
                        },
                    },
                },
                tooltip: {
                    callbacks: {
                        label: (context: any) => {
                            const label = context.label;
                            if (label === this.translate.getInstant('shared.messages.noDataAvailable')) {
                                return '';
                            }
                            return `${label}: ${context.raw}`;
                        },
                    },
                },
                datalabels: {
                    formatter: (value: any, context: { dataIndex: number; chart: any }) => {
                        const label = context.chart.data.labels[context.dataIndex];
                        const numericValue = Number(value);
                        if (label === this.translate.getInstant('shared.messages.noDataAvailable')) {
                            return this.translate.getInstant('shared.messages.noDataAvailable');
                        }
                        if (!isNaN(numericValue) && numericValue !== 0) {
                            return `${numericValue}`;
                        }
                        return '';
                    },
                    color: '#fff',
                    font: {
                        size: 14,
                        weight: 'bold',
                    },
                    usePointStyle: true,
                    anchor: 'center',
                    align: 'center',
                    padding: {
                        left: 10,
                    },
                },
            },
            onClick: this.onCompletedCampaignSliceClick.bind(this),
            onHover: (event: any, chartElement: any) => {
                event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            },
        };
    }

    updateCompletedCampaignsDashboardTrendAnalysisChartData() {
        const documentStyle = getComputedStyle(document.documentElement);
        const { actualData, labels, targetData } = this.campaignsDashboardTrendAnalysisData;
        this.campaignsDashboardTrendAnalysisChartData = {
            labels: labels,
            datasets: [
                {
                    label: this.translate.getInstant('trainingCampaignsDashboard.excepted'),
                    data: targetData,
                    fill: false,
                    borderColor: documentStyle.getPropertyValue('--blue-500'),
                    tension: 0.4,
                },
                {
                    label: this.translate.getInstant('trainingCampaignsDashboard.actual'),
                    data: actualData,
                    fill: false,
                    borderColor: documentStyle.getPropertyValue('--pink-500'),
                    tension: 0.4,
                },
            ],
        };
    }

    initCompletedCampaignsDashboardTrendAnalysisChartOptions() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
        const surfaceBorder = documentStyle.getPropertyValue('--surface-border');
        this.campaignsDashboardTrendAnalysisChartOptions = {
            maintainAspectRatio: false,
            aspectRatio: 0.6,
            plugins: {
                legend: {
                    position: 'top', // Keeps legend at the top,
                    usePointStyle: true,
                    align: 'center',  // Ensures all items start at the same point (use 'end' for right alignment)
                    labels: {
                        usePointStyle: true, // Uses circular bullets instead of rectangles
                        boxWidth: 14, // Ensures uniform icon size
                        boxHeight: 14, // Ensures proper aspect ratio
                        padding: 10, // Adds spacing between legend items
                        textAlign: 'left', // Forces text alignment to start at the same point
                        fullSize: false, // Prevents stretching across the chart width
                        font: {
                            size: 14,
                            weight: 'bold', // Makes text clearer
                        },
                    },
                },
                datalabels: {
                    display: false,
                },
            },
            scales: {
                x: {
                    ticks: {
                        color: textColorSecondary,
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false,
                    },
                },
                y: {
                    ticks: {
                        color: textColorSecondary,
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false,
                    },
                },
            },
        };
    }

    onCompletedCampaignSliceClick(event: any) {
        const activePoints = event.chart.getElementsAtEventForMode(event.native, 'nearest', { intersect: true }, false);
        this.completedCampaignNameForReport =
            this.historyCampaignsDataForDashboardDropDown.find((c) => c.campaignId == this.completedCampaignDashboardId)
                ?.campaignName ?? '';
        if (activePoints.length) {
            const chartElement = activePoints[0];
            const dataIndex = chartElement.index;
            const label = event.chart.data.labels[dataIndex];

            switch (label) {
                case this.translate.getInstant('trainingCampaignsDashboard.completed'):
                    this.displayCompletedCampaignCompletedDialog = true;
                    this.getGetCompletedAwarenessCampaignsUsersForDashboard('Completed');
                    break;
                case this.translate.getInstant('trainingCampaignsDashboard.failed'):
                    this.displayCompletedCampaignFailedDialog = true;
                    this.getGetCompletedAwarenessCampaignsUsersForDashboard('Failed');
                    break;
                default:
                    break;
            }
        }
    }

    onCurrentCampaignsDashboardDropdownChanged(event: DropdownChangeEvent) {
        if (event.value === 'all') {
            this.currentCampaignDashboardId = 'all';
            this.currentCampaignNameForReport = 'All Runining Training Campaigns';
        } else {
            this.currentCampaignDashboardId = event.value;
            this.currentCampaignNameForReport =
                this.trainingAwarenessCampaignsForDashboardDropDown.find((c) => c.campaignId === event.value)
                    ?.campaignName ?? '';
        }
        this.fetchCurrentCampaignsDashboard();
        this.fetchTrainingCampaignsLeaderboardData();
    }

    onCompletedCampaignsDashboardDropdownChanged(event: DropdownChangeEvent) {
        if (event.value === 'all') {
            this.completedCampaignDashboardId = 'all';
            this.completedCampaignNameForReport = 'All Completed Training Campaigns';
        } else {
            this.completedCampaignDashboardId = event.value;
            this.completedCampaignNameForReport =
                this.historyCampaignsDataForDashboardDropDown.find((c) => c.campaignId === event.value)?.campaignName ??
                '';
        }
        this.fetchCompletedCampaignsDashboard();
    }

    onCompletedTrendAnalysisDashboardDropdownChanged(event: DropdownChangeEvent) {
        this.selectedMonth = event.value;
        this.fetchCompletedCampaignsTrendAnalysisDashboard();
    }

    addToSelected(user: ITrainingCampaignUserModel) {
        this.checkboxStates[user.userId] = true;
        this.campaignUsersSelected.push(user);
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

    downloadCurrentSelectedUsersReportAsPDF(action: string) {
        const data = this.campaignUsersSelected.map((w) => ({
            User: `${w.userName}\n${w.userEmail}`,
            TenantUnit: w.unitName || '',
            Campaign: `${w.name}\n\n${this.formatDate(w.startDate)} - ${this.formatDate(w.endDate)}` || '',
            Lesson: w.lessonName || '',
            ...(action !== 'Not Started' && { Score: `${w.score ?? 0}%` }),
        }));

        const headers = [
            { header: 'User', dataKey: 'User' },
            { header: 'Department', dataKey: 'TenantUnit' },
            { header: 'Campaign', dataKey: 'Campaign' },
            { header: 'Lesson', dataKey: 'Lesson' },
            ...(action !== 'Not Started' ? [{ header: 'Quiz Score', dataKey: 'Score' }] : []),
        ];
        this.pdfService.exportDataToPdfVI(data, `${this.currentCampaignNameForReport} ${action}`, headers);
    }

    async downloadCurrentSelectedUsersReportAsCSV(action: string) {
        const data = this.campaignUsersSelected.map((w) => {
            return {
                User: `${w.userName}`,
                UserEmail: `${w.userEmail}`,
                TenantUnit: w.unitName,
                Campaign: `${w.name}`,
                CampaignStartDate: this.formatDate(w.startDate),
                CampaignEndDate: this.formatDate(w.endDate),
                Lesson: w.lessonName,
                ...(action !== 'Not Started' && { Score: `${w.score ?? 0}%` }),
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
            ...(action !== 'Not Started' ? [{ header: 'Quiz Score', dataKey: 'Score' }] : []),
        ];
        await this.excelService.exportExcelVI(data, `${this.currentCampaignNameForReport} ${action} Report`, headers);
    }

    downloadCompletedSelectedUsersReportAsPDF(action: string) {
        const data = this.campaignUsersSelected.map((w) => ({
            User: `${w.userName}\n${w.userEmail}`,
            TenantUnit: w.unitName || '',
            Campaign: `${w.name}\n\n${this.formatDate(w.startDate)} - ${this.formatDate(w.endDate)}` || '',
            Lesson: w.lessonName || '',
            ...(action !== 'Not Started' && { Score: `${w.score ?? 0}%` }),
        }));

        const headers = [
            { header: 'User', dataKey: 'User' },
            { header: 'Department', dataKey: 'TenantUnit' },
            { header: 'Campaign', dataKey: 'Campaign' },
            { header: 'Lesson', dataKey: 'Lesson' },
            ...(action !== 'Not Started' ? [{ header: 'Quiz Score', dataKey: 'Score' }] : []),
        ];
        this.pdfService.exportDataToPdfVI(data, `${this.completedCampaignNameForReport} ${action}`, headers);
    }

    async downloadCompletedSelectedUsersReportAsCSV(action: string) {
        const data = this.campaignUsersSelected.map((w) => {
            return {
                User: `${w.userName}`,
                UserEmail: `${w.userEmail}`,
                TenantUnit: w.unitName,
                Campaign: `${w.name}`,
                CampaignStartDate: this.formatDate(w.startDate),
                CampaignEndDate: this.formatDate(w.endDate),
                Lesson: w.lessonName,
                ...(action !== 'Not Started' && { Score: `${w.score ?? 0}%` }),
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
            ...(action !== 'Not Started' ? [{ header: 'Quiz Score', dataKey: 'Score' }] : []),
        ];
        await this.excelService.exportExcelVI(data, `${this.completedCampaignNameForReport} ${action} Report`, headers);
    }

    downloadAllCurrentCampaignUsersReportAsPDF() {
        console.log(this.currentCampaignNameForReport);
        this.apiService.getUsersByActionCurrentCampaignsDashboard(this.currentCampaignDashboardId, 'all').subscribe({
            next: (users) => {
                this.campaignUsers = users.data;
                if (this.campaignUsers && this.campaignUsers.length > 0) {
                    const data = this.campaignUsers.map((w) => ({
                        User: `${w.userName}\n${w.userEmail}`,
                        TenantUnit: w.unitName || '',
                        Campaign: `${w.name}\n\n${this.formatDate(w.startDate)} - ${this.formatDate(w.endDate)}` || '',
                        Lesson: w.lessonName || '',
                        Score: `${w.score ?? 0}%`,
                    }));

                    const headers = [
                        { header: 'User', dataKey: 'User' },
                        { header: 'Department', dataKey: 'TenantUnit' },
                        { header: 'Campaign', dataKey: 'Campaign' },
                        { header: 'Lesson', dataKey: 'Lesson' },
                        { header: 'Quiz Score', dataKey: 'Score' },
                    ];
                    this.pdfService.exportDataToPdfVI(
                        data,
                        this.currentCampaignNameForReport?.replace('[R]', 'Running'),
                        headers
                    );
                } else {
                    this.messageService.add({
                        severity: 'info',
                        summary: 'No Data',
                        detail: 'No data found for generate report.',
                    });
                }
            },
            error: (error) => {
                console.error('Error fetching users by action:', error);
            },
        });
    }

    downloadAllCurrentCampaignUsersReportAsCSV() {
        this.apiService.getUsersByActionCurrentCampaignsDashboard(this.currentCampaignDashboardId, 'all').subscribe({
            next: async (users) => {
                this.campaignUsers = users.data;
                if (this.campaignUsers && this.campaignUsers.length > 0) {
                    const data = this.campaignUsers.map((w) => {
                        return {
                            User: `${w.userName}`,
                            UserEmail: `${w.userEmail}`,
                            TenantUnit: w.unitName,
                            Campaign: `${w.name}`,
                            CampaignStartDate: this.formatDate(w.startDate),
                            CampaignEndDate: this.formatDate(w.endDate),
                            Lesson: w.lessonName,
                            Score: `${w.score ?? 0}%`,
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
                        { header: 'Quiz Score', dataKey: 'Score' },
                    ];
                    await this.excelService.exportExcelVI(
                        data,
                        this.currentCampaignNameForReport?.replace('[R]', 'Running'),
                        headers
                    );
                } else {
                    this.messageService.add({
                        severity: 'info',
                        summary: 'No Data',
                        detail: 'No data found for generate report.',
                    });
                }
            },
            error: (error) => {
                console.error('Error fetching users by action:', error);
            },
        });
    }

    downloadAllCompletedCampaignUsersReportAsPDF() {
        this.apiService
            .getUsersByActionCompletedCampaignsDashboard(this.completedCampaignDashboardId, 'all')
            .subscribe({
                next: (users) => {
                    this.campaignUsers = users.data;
                    if (this.campaignUsers && this.campaignUsers.length > 0) {
                        const data = this.campaignUsers.map((w) => ({
                            User: `${w.userName}\n${w.userEmail}`,
                            TenantUnit: w.unitName || '',
                            Campaign:
                                `${w.name}\n\n${this.formatDate(w.startDate)} - ${this.formatDate(w.endDate)}` || '',
                            Lesson: w.lessonName || '',
                            Score: `${w.score ?? 0}%`,
                        }));

                        const headers = [
                            { header: 'User', dataKey: 'User' },
                            { header: 'Department', dataKey: 'TenantUnit' },
                            { header: 'Campaign', dataKey: 'Campaign' },
                            { header: 'Lesson', dataKey: 'Lesson' },
                            { header: 'Quiz Score', dataKey: 'Score' },
                        ];
                        this.pdfService.exportDataToPdfVI(
                            data,
                            this.completedCampaignNameForReport?.replace('[C]', 'Completed'),
                            headers
                        );
                    } else {
                        this.messageService.add({
                            severity: 'info',
                            summary: 'No Data',
                            detail: 'No data found for generate report.',
                        });
                    }
                },
                error: (error) => {
                    console.error('Error fetching users by action:', error);
                },
            });
    }

    downloadAllCompletedCampaignUsersReportAsCSV() {
        this.apiService
            .getUsersByActionCompletedCampaignsDashboard(this.completedCampaignDashboardId, 'all')
            .subscribe({
                next: async (users) => {
                    this.campaignUsers = users.data;

                    if (this.campaignUsers && this.campaignUsers.length > 0) {
                        const data = this.campaignUsers.map((w) => {
                            return {
                                User: `${w.userName}`,
                                UserEmail: `${w.userEmail}`,
                                TenantUnit: w.unitName,
                                Campaign: `${w.name}`,
                                CampaignStartDate: this.formatDate(w.startDate),
                                CampaignEndDate: this.formatDate(w.endDate),
                                Lesson: w.lessonName,
                                Score: `${w.score ?? 0}%`,
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
                            { header: 'Quiz Score', dataKey: 'Score' },
                        ];
                        await this.excelService.exportExcelVI(
                            data,
                            this.completedCampaignNameForReport.replace('[C]', 'Completed'),
                            headers
                        );
                    } else {
                        this.messageService.add({
                            severity: 'info',
                            summary: 'No Data',
                            detail: 'No data found for generate report.',
                        });
                    }
                },
                error: (error) => {
                    console.error('Error fetching users by action:', error);
                },
            });
    }

    formatDate(date: Date): string {
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
        return new Intl.DateTimeFormat('en-US', options).format(new Date(date));
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    getTrainingCampaignUsers(): ITrainingCampaignUserModel[] {
        const uniqueUserIds = new Set<string>();
        return this.campaignUsers.filter((user) => {
            if (!uniqueUserIds.has(user.userId)) {
                uniqueUserIds.add(user.userId);
                return true;
            }
            return false;
        });
    }

    ngOnDestroy(): void {
        this.unsubscribe.forEach((u) => {
            u.unsubscribe();
        });
    }
}