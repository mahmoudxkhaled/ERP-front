import { Directive, ElementRef, Renderer2, HostListener } from '@angular/core';

@Directive({
    selector: '[appDisableOnClick]',
    standalone: true,
})
export class DisableOnClickDirectisve {
    constructor(private el: ElementRef, private renderer: Renderer2) {}

    @HostListener('click', ['$event'])
    handleClick(event: Event) {
        const button = this.el.nativeElement as HTMLButtonElement;

        // Check if the button is already disabled
        if (button.disabled) {
            event.preventDefault(); // Prevent the click if already disabled
            return;
        }

        // Disable the button after the first click
        this.renderer.setAttribute(button, 'disabled', 'true');

        // Optionally, re-enable the button after a delay if no service response is used
        // Adjust this timeout as needed or remove if using a service to re-enable
        setTimeout(() => {
            this.renderer.removeAttribute(button, 'disabled');
        }, 2000); // Example delay: 2 seconds. Adjust according to your requirements.
    }
}
