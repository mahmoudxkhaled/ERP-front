import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Regex pattern for validating text fields (Code, Name, Description)
 * Allows: letters (A–Z, a–z, any language letters), space, hyphen, apostrophe, dot, underscore
 */
export const TEXT_FIELD_PATTERN = /^[\p{L}\s'\-._]+$/u;

/**
 * Standard error message for invalid format
 */
export const INVALID_FORMAT_MESSAGE = 'Only letters, spaces, hyphens (-), apostrophes (\'), dots (.), and underscores (_) are allowed.';

/**
 * Gets the regex pattern for text field validation
 * @returns The regex pattern for text field validation
 */
export function getTextFieldPattern(): RegExp {
    return TEXT_FIELD_PATTERN;
}

/**
 * Validator function for text fields (Code, Name, Description, First Name, Last Name, etc.)
 * Allows: letters (A–Z, a–z, any language letters), space, hyphen, apostrophe, dot, underscore
 * 
 * @returns ValidatorFn that returns null if valid, or { invalidFormat: true } if invalid
 * 
 * @example
 * ```typescript
 * this.form = this.fb.group({
 *   code: ['', [Validators.required, textFieldValidator()]],
 *   name: ['', [Validators.required, textFieldValidator()]]
 * });
 * ```
 */
export function textFieldValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        // If control has no value, return null (let required validator handle empty values)
        if (!control.value) {
            return null;
        }

        const isValid = TEXT_FIELD_PATTERN.test(control.value);
        return isValid ? null : { invalidFormat: true };
    };
}

/**
 * Generic utility function to get validation error messages for text fields
 * Handles both 'required' and 'invalidFormat' errors
 * 
 * @param control - The form control to check for errors
 * @param fieldName - The display name of the field (e.g., 'First name', 'Code', 'Description')
 * @param showError - Boolean condition to determine if error should be shown (usually submitted or touched)
 * @returns Error message string, or empty string if no error
 * 
 * @example
 * ```typescript
 * get firstNameError(): string {
 *   return getTextFieldError(this.f['firstName'], 'First name', this.submitted);
 * }
 * ```
 */
export function getTextFieldError(
    control: AbstractControl | null | undefined,
    fieldName: string,
    showError: boolean
): string {
    if (!control || !showError) {
        return '';
    }

    // Check for required error
    if (control.errors?.['required']) {
        return `${fieldName} is required.`;
    }

    // Check for invalid format error
    if (control.errors?.['invalidFormat']) {
        return INVALID_FORMAT_MESSAGE;
    }

    return '';
}


