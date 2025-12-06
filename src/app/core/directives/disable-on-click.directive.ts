import { Directive, ElementRef, Renderer2, HostListener } from '@angular/core';

@Directive({
    selector: '[appDisableOnClick]',
    standalone: true,
})
export class DisableOnClickDirectisve {
    constructor(private el: ElementRef, private renderer: Renderer2) { }

    @HostListener('click', ['$event'])
    handleClick(event: Event) {
        const button = this.el.nativeElement as HTMLButtonElement;

        if (button.disabled) {
            event.preventDefault();
            return;
        }

        this.renderer.setAttribute(button, 'disabled', 'true');

        setTimeout(() => {
            this.renderer.removeAttribute(button, 'disabled');
        }, 2000);
    }
}
