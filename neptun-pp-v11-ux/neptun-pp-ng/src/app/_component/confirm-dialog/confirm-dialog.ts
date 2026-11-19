import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

/**
 * Megerősítő modal az ng-bootstrap NgbModal szolgáltatásával.
 * Nem kell sem rejtett gomb, sem Bootstrap JS: a megnyitás egy függvényhívás,
 * az eredményt pedig egy Promise adja vissza:
 *
 *   const modalRef = this.modal.open(ConfirmDialog);
 *   modalRef.componentInstance.message = 'Biztosan?';
 *   modalRef.result.then(() => ...igen..., () => ...mégse...);
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-confirm-dialog',
  styleUrl: './confirm-dialog.scss',
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  /** A megnyitott modal referenciája: close() → then ág, dismiss() → catch ág */
  protected readonly activeModal = inject(NgbActiveModal);

  @Input() message = '';
}
