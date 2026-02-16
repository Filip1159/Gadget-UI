import { Component } from '@angular/core'
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'
import { faUserSecret } from '@fortawesome/free-solid-svg-icons'

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [FontAwesomeModule],
    templateUrl: './header.html',
    styleUrl: './header.scss',
})
export class Header {
    faUserSecret = faUserSecret
}
