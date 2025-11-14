import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-logout',
  templateUrl: './logout.component.html',
  styleUrl: './logout.component.scss'
})
export class LogoutComponent {
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  onConfirmLogout() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.onConfirm.emit();
  }

  onCancelLogout() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.onCancel.emit();
  }
}