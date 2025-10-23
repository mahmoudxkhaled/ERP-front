import { Component, OnInit } from '@angular/core';
import { SelectItem } from 'primeng/api';
import { Subscription, debounceTime } from 'rxjs';
import { LayoutService } from 'src/app/layout/app-services/app.layout.service';

interface MonthlyPayment {
    name?: string;
    amount?: number;
    paid?: boolean;
    date?: string;
}

@Component({
    templateUrl: './dashboardbanking.component.html',
})
export class DashboardBankingComponent implements OnInit {
    dropdownItem: SelectItem[] = [];

    selectedDropdownItem: any;

    payments: MonthlyPayment[] = [];

    visitorChart: any;

    visitorChartOptions: any;

    subscription!: Subscription;

    constructor(public layoutService: LayoutService) {
        this.subscription = this.layoutService.configUpdate$.pipe(debounceTime(25)).subscribe((config) => {
            this.initChart();
        });
    }

    ngOnInit() {
        this.dropdownItem.push({ label: 'Select One', value: null });
        this.dropdownItem.push({
            label: 'Xbox Series X',
            value: { id: 1, name: 'Xbox One', code: 'XO' },
        });
        this.dropdownItem.push({
            label: 'PlayStation 5',
            value: { id: 2, name: 'PS4', code: 'PS4' },
        });
        this.dropdownItem.push({
            label: 'Nintendo Switch',
            value: { id: 3, name: 'Wii U', code: 'WU' },
        });

        this.payments = [
            {
                name: 'Electric Bill',
                amount: 75.6,
                paid: true,
                date: '06/04/2022',
            },
            {
                name: 'Water Bill',
                amount: 45.5,
                paid: true,
                date: '07/04/2022',
            },
            { name: 'Gas Bill', amount: 45.2, paid: false, date: '12/04/2022' },
            {
                name: 'Internet Bill',
                amount: 25.9,
                paid: true,
                date: '17/04/2022',
            },
            {
                name: 'Streaming',
                amount: 40.9,
                paid: false,
                date: '20/04/2022',
            },
            {
                name: 'Phone Bill',
                amount: 32.9,
                paid: false,
                date: '23/04/2022',
            },
        ];

        this.initChart();
    }

    initChart() {
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-color');
        const primaryColor = getComputedStyle(document.body).getPropertyValue('--primary-color');
        const surfaceLight = getComputedStyle(document.body).getPropertyValue('--surface-100');

        this.visitorChart = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
            datasets: [
                {
                    data: [600, 671, 660, 665, 700, 610, 810, 790, 710, 860, 810, 780],
                    backgroundColor: primaryColor,
                    fill: true,
                    barPercentage: 0.75,
                    stepped: true,
                },
            ],
        };

        this.visitorChartOptions = {
            plugins: {
                legend: {
                    display: false,
                },
            },
            responsive: true,
            hover: {
                mode: 'index',
            },
            scales: {
                y: {
                    min: 500,
                    max: 900,
                    ticks: {
                        color: textColor,
                    },
                    grid: {
                        color: surfaceLight,
                    },
                },
                x: {
                    ticks: {
                        color: textColor,
                    },
                    grid: {
                        display: false,
                    },
                },
            },
        };
    }
}
