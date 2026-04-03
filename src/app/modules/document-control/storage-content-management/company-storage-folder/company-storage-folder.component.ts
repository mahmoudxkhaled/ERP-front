import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-company-storage-folder',
  templateUrl: './company-storage-folder.component.html',
  styleUrls: ['./company-storage-folder.component.scss'],
})
export class CompanyStorageFolderComponent implements OnInit {
  fileSystemId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((pm) => {
      const id = Number(pm.get('fileSystemId') || 0);
      if (!Number.isFinite(id) || id <= 0) {
        void this.router.navigate(['/document-control/storage-content-management/company-storage']);
        return;
      }
      this.fileSystemId = id;
    });
  }
}
