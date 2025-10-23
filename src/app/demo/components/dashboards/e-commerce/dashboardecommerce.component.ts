import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Subscription, debounceTime } from 'rxjs';
import { Product } from 'src/app/demo/api/product';
import { AppConfig, LayoutService } from 'src/app/layout/app-services/app.layout.service';
import { ProductService } from '../../../service/product.service';
import { Table } from 'primeng/table';

@Component({
    templateUrl: './dashboardecommerce.component.html',
})
export class DashboardEcommerceComponent implements OnInit {
    products!: Product[];

    chartData: any;

    chartOptions: any;

    config: AppConfig = this.layoutService.config();

    items!: MenuItem[];

    cols: any[] = [];

    subscription!: Subscription;

    @ViewChild('chatcontainer') chatContainerViewChild!: ElementRef;

    constructor(private productService: ProductService, public layoutService: LayoutService) {
        this.subscription = this.layoutService.configUpdate$.pipe(debounceTime(25)).subscribe((config) => {
            this.chartInit();
        });
    }

    ngOnInit() {
        this.productService.getProducts().then((data) => (this.products = data));

        this.cols = [
            { header: 'Name', field: 'name' },
            { header: 'Category', field: 'category' },
            { header: 'Price', field: 'price' },
            { header: 'Status', field: 'inventoryStatus' },
        ];

        this.chartInit();
    }

    chartInit() {
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-color') || 'rgba(0, 0, 0, 0.87)';
        const surface300 = getComputedStyle(document.body).getPropertyValue('--surface-300');

        this.items = [
            {
                label: 'Options',
                items: [
                    { label: 'Add New', icon: 'pi pi-fw pi-plus' },
                    { label: 'Search', icon: 'pi pi-fw pi-search' },
                ],
            },
        ];

        this.chartData = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [
                {
                    label: 'New',
                    data: [11, 17, 30, 60, 88, 92],
                    backgroundColor: 'rgba(13, 202, 240, .2)',
                    borderColor: '#0dcaf0',
                    pointBackgroundColor: '#0dcaf0',
                    pointBorderColor: '#0dcaf0',
                    pointBorderWidth: 0,
                    pointStyle: 'line',
                    fill: false,
                    tension: 0.4,
                },
                {
                    label: 'Completed',
                    data: [11, 19, 39, 59, 69, 71],
                    backgroundColor: 'rgba(253, 126, 20, .2)',
                    borderColor: '#fd7e14',
                    pointBackgroundColor: '#fd7e14',
                    pointBorderColor: '#fd7e14',
                    pointBorderWidth: 0,
                    pointStyle: 'line',
                    fill: false,
                    tension: 0.4,
                },
                {
                    label: 'Canceled',
                    data: [11, 17, 21, 30, 47, 83],
                    backgroundColor: 'rgba(111, 66, 193, .2)',
                    borderColor: '#6f42c1',
                    pointBackgroundColor: '#6f42c1',
                    pointBorderColor: '#6f42c1',
                    pointBorderWidth: 0,
                    pointStyle: 'line',
                    fill: true,
                    tension: 0.4,
                },
            ],
        };

        this.chartOptions = {
            plugins: {
                legend: {
                    fill: true,
                    labels: {
                        color: textColor,
                    },
                },
            },
            scales: {
                y: {
                    max: 100,
                    min: 0,
                    grid: {
                        color: surface300,
                    },
                    ticks: {
                        color: textColor,
                    },
                },
                x: {
                    grid: {
                        display: true,
                        color: surface300,
                    },
                    ticks: {
                        color: textColor,
                        beginAtZero: true,
                    },
                },
            },
        };
    }

    onEmojiClick(chatInput: any, emoji: string) {
        if (chatInput) {
            chatInput.value += emoji;
            chatInput.focus();
        }
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }
}
