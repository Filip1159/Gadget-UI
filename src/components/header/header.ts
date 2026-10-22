import { Component, computed, inject } from '@angular/core';
import { SocketService } from '../../core/socket/socket.service';

const STATUS_LABELS = { open: 'Online', connecting: 'Connecting', closed: 'Offline' } as const;

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  protected socket = inject(SocketService);
  statusLabel = computed(() => STATUS_LABELS[this.socket.status()]);
}
